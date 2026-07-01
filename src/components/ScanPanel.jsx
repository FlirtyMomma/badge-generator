import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../supabaseClient';
import SavedBatchList from './SavedBatchList';

export default function ScanPanel({ 
  mode, 
  lookUpProduct, 
  scannedProduct, 
  setScannedProduct, 
  setActiveZoomBarcode, 
  savedProducts, 
  setSavedProducts,
  session,  
  storeId   
}) {
  const [manualBarcode, setManualBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [uiPaused, setUiPaused] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const html5QrcodeRef = useRef(null);

  const playSuccessBeep = () => {
    try {
      if (navigator.vibrate) navigator.vibrate(100);
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'square';
      oscillator.frequency.value = 1050; 
      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime); 
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08); 
    } catch (err) {
      console.warn("Hardware feedback context blocked:", err);
    }
  };

  // CORE INTERCEPT: Multi-stage relational unique pallet transfer with burn-on-read & audit logging
  const handleScannedDataValidation = async (text) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    if (cleanText.startsWith("HUB_TRANSFER:")) {
      playSuccessBeep();
      stopCamera();
      setUiPaused(true);

      // 1. HARD SECURITY CHECK: Block unauthorised terminals
      if (!session || !storeId || !session.user?.id) {
        alert("Access Denied: You must be logged into a valid store terminal node to process stock transfers.");
        setScannedProduct(null);
        setUiPaused(false);
        return;
      }

      // Parse out our composite unique token signature keys
      const [_, transferId, season, originalPalletNum, globalPalletKey] = cleanText.split(":");
      
      // 2. BURN-ON-READ VALIDATION: Ensure this QR code has never been used before
      try {
        const { data: consumedRecord, error: consumedError } = await supabase
          .from('consumed_manifests')
          .select('consumed_by_store, consumed_at')
          .eq('manifest_id', transferId)
          .maybeSingle();

        if (consumedError) throw consumedError;

        if (consumedRecord) {
          const formattedDate = new Date(consumedRecord.consumed_at).toLocaleString('en-GB');
          alert(`EXPIRED MANIFEST DETECTED\n\nThis QR code has already been scanned and processed by Store ${consumedRecord.consumed_by_store} on ${formattedDate}.\n\nIt can no longer be used. If this stock is moving again, a brand new manifest must be generated from the source terminal.`);
          setScannedProduct(null);
          setUiPaused(false);
          return;
        }
      } catch (err) {
        alert(`Security Validation Error: Unable to verify manifest status. (${err.message})`);
        setScannedProduct(null);
        setUiPaused(false);
        return;
      }

      const targetPalletSearchNumber = originalPalletNum.replace(/\D/g, '').trim();
      const targetSeasonSearchString = season.trim();
      const sourcePalletLookupKey = globalPalletKey || `${targetSeasonSearchString.replace(/\s+/g, '').toUpperCase()}-P${targetPalletSearchNumber}`;

      // 3. LIVE OWNERSHIP VALIDATION: Fetch active pallet information record
      let activePalletRecord = null;
      try {
        const { data, error: fetchError } = await supabase
          .from('store_pallets')
          .select('*')
          .eq('pallet_id', sourcePalletLookupKey)
          .maybeSingle();

        if (fetchError) throw fetchError;
        activePalletRecord = data;
      } catch (err) {
        alert(`Transfer Error: Unable to query registry database. (${err.message})`);
        setScannedProduct(null);
        setUiPaused(false);
        return;
      }

      // If the master tracking pallet doesn't exist yet, look up who has those items counted right now
      let sourceUserUuid = null;
      if (activePalletRecord) {
        const { data: oldProfile } = await supabase
          .from('store_profiles')
          .select('id')
          .eq('store_id', activePalletRecord.current_owner_store_id)
          .maybeSingle();
        if (oldProfile) sourceUserUuid = oldProfile.id;
      }

      // Fallback: If no wrapper exists yet, query the items directly to see who counted them
      if (!sourceUserUuid) {
        const { data: sampleCount } = await supabase
          .from('legacy_stock_counts')
          .select('user_id')
          .eq('pallet_number', targetPalletSearchNumber)
          .eq('season_type', targetSeasonSearchString)
          .limit(1)
          .maybeSingle();
        
        if (sampleCount) sourceUserUuid = sampleCount.user_id;
      }

      // If the pallet wrapper entry doesn't exist in the registry tracking index, initialise it
      if (!activePalletRecord) {
        let inferredOriginStore = 'INITIAL_MANIFEST_ORIGIN';
        if (sourceUserUuid) {
          const { data: profileLookup } = await supabase
            .from('store_profiles')
            .select('store_id')
            .eq('id', sourceUserUuid)
            .maybeSingle();
          if (profileLookup) inferredOriginStore = profileLookup.store_id;
        }

        const { data: newPallet, error: insertError } = await supabase
          .from('store_pallets')
          .insert({ pallet_id: sourcePalletLookupKey, current_owner_store_id: inferredOriginStore })
          .select('current_owner_store_id')
          .single();

        if (insertError) {
          alert(`Registry Initialisation Failed: ${insertError.message}`);
          setScannedProduct(null);
          setUiPaused(false);
          return;
        }
        activePalletRecord = newPallet;
      }

      // 4. REDUNDANCY SAFEGUARD: Block operations if your store already owns this configuration
      if (activePalletRecord.current_owner_store_id === storeId || sourceUserUuid === session.user.id) {
        alert(`Operation Cancelled: Store ${storeId} already holds the active user configuration for this seasonal stock container.`);
        setScannedProduct(null);
        setUiPaused(false);
        return;
      }

      // 5. AUTO-INCREMENT CALCULATOR: Find the highest sequence number the receiving store owns for this season
      const cleanSeasonTag = targetSeasonSearchString.replace(/\s+/g, '').toUpperCase();
      let nextPalletNum = 1;

      try {
        const { data: storePalletsForSeason, error: countError } = await supabase
          .from('store_pallets')
          .select('pallet_id')
          .eq('current_owner_store_id', storeId)
          .like('pallet_id', `${cleanSeasonTag}-P%`);

        if (countError) throw countError;
        
        if (storePalletsForSeason && storePalletsForSeason.length > 0) {
          const existingNumbers = storePalletsForSeason.map(p => {
            const parts = p.pallet_id.split('-P');
            return parts.length > 1 ? parseInt(parts[1], 10) : 0;
          }).filter(num => !isNaN(num));

          if (existingNumbers.length > 0) {
            nextPalletNum = Math.max(...existingNumbers) + 1;
          }
        }
      } catch (err) {
        console.warn("Failed to calculate step increments, defaulting safe index hook:", err);
        nextPalletNum = 1;
      }

      const destinationPalletKey = `${cleanSeasonTag}-P${nextPalletNum}`;

      const confirmReceipt = window.confirm(
        `STOCK MANIFEST VALIDATED\n\nIncoming: ${targetSeasonSearchString} (Originally Pallet ${targetPalletSearchNumber})\nDestination: Store ${storeId}\n\nAction: This stock will be appended as a brand new Pallet record entry: "Pallet ${nextPalletNum}" under your store holdings.\n\nExecute database ownership transfer?`
      );

      if (confirmReceipt) {
        // 6. TRANSACTION ENGINE PHASE 1: Update/Upsert the master pallet tracking container row
        const { error: updateError } = await supabase
          .from('store_pallets')
          .upsert({ 
            pallet_id: destinationPalletKey,
            current_owner_store_id: storeId,
            last_transferred_at: new Date().toISOString(),
            manifest_origin_code: transferId
          });

        if (updateError) {
          alert(`Database Write Rejection: ${updateError.message}`);
          setScannedProduct(null);
          setUiPaused(false);
          return;
        }

        // PHASE 2: DIAGNOSTIC RELATIONAL INVENTORY MIGRATION
        const { data: sampleRows } = await supabase
          .from('legacy_stock_counts')
          .select('pallet_number, season_type')
          .ilike('season_type', `%${targetSeasonSearchString}%`)
          .limit(5);

        if (!sampleRows || sampleRows.length === 0) {
          alert(`Diagnostic Error:\n\nNo stock lines found in your database table for the season "${targetSeasonSearchString}" at all.\n\nPlease check your spelling or verify that counts have been uploaded.`);
          setScannedProduct(null);
          setUiPaused(false);
          return;
        }

        // Execute relational shift using multiple layout string format variables to guarantee a match lock
        const { data: movedRows, error: inventoryError } = await supabase
          .from('legacy_stock_counts')
          .update({ 
            user_id: session.user.id,        
            pallet_number: destinationPalletKey 
          })
          .eq('season_type', targetSeasonSearchString)
          .or(`pallet_number.eq.${targetPalletSearchNumber},pallet_number.eq.Pallet ${targetPalletSearchNumber},pallet_number.eq.${originalPalletNum}`)
          .select();

        let finalItemCount = 0;

        if (inventoryError) {
          alert(`Pallet tracking registry initialised, but underlying item balances failed to re-allocate: ${inventoryError.message}`);
        } else if (!movedRows || movedRows.length === 0) {
          const sampleList = sampleRows.map(r => `Pallet: "${r.pallet_number}" | Season: "${r.season_type}"`).join('\n');
          alert(`Match Failure (0 rows updated):\n\nYour manifest wanted Pallet "${targetPalletSearchNumber}" for "${targetSeasonSearchString}".\n\nBut here is what your database actually contains:\n${sampleList}\n\nPlease update your print configuration or input values to match.`);
        } else {
          
          finalItemCount = movedRows.length;

          // PHASE 3: BURN THE MANIFEST & WRITE AUDIT TRAIL
          const originStoreId = activePalletRecord?.current_owner_store_id || 'UNKNOWN';

          const { error: burnError } = await supabase
            .from('consumed_manifests')
            .insert({ 
              manifest_id: transferId,
              consumed_by_store: storeId 
            });

          const { error: auditError } = await supabase
            .from('transfer_history')
            .insert({
              manifest_id: transferId,
              season: targetSeasonSearchString,
              pallet_name: `Pallet ${nextPalletNum}`,
              origin_store: originStoreId,
              destination_store: storeId,
              items_moved: finalItemCount
            });
            
          if (burnError || auditError) {
            console.error("Audit log failure:", burnError || auditError);
            alert(`Transfer Success! (Warning: Could not completely write to the digital audit trail due to network connection, please retain the physical printout).`);
          } else {
            alert(`Success! Securely transferred ${finalItemCount} item stock lines to Store ${storeId} database layouts as Pallet ${nextPalletNum}. \n\nThe manifest QR code has been permanently deactivated.`);
          }
        }
      }
      
      setScannedProduct(null);
      setUiPaused(false);
      return;
    }

    lookUpProduct(cleanText);
  };

  const startCamera = async () => {
    setCameraError(false); // Reset error state before attempting to launch
    try {
      if (!html5QrcodeRef.current) html5QrcodeRef.current = new Html5Qrcode("reader");
      if (html5QrcodeRef.current.isScanning) return;

      const scanConfig = {
        fps: 20, 
        qrbox: { width: 260, height: 160 },
        videoConstraints: {
          facingMode: { exact: "environment" },
          width: { ideal: 1920, min: 1080 },
          height: { ideal: 1080, min: 720 }
        }
      };

      const onScanSuccess = (text) => {
        playSuccessBeep();
        stopCamera();
        setUiPaused(true);
        handleScannedDataValidation(text);
      };

      await html5QrcodeRef.current.start({ facingMode: { exact: "environment" } }, scanConfig, onScanSuccess, () => {});
      setIsScanning(true);
    } catch (err) {
      console.warn("Strict environment lock rejected, attempting relaxed browser fallback:", err);
      try {
        await html5QrcodeRef.current.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 260, height: 160 } },
          (text) => {
            playSuccessBeep();
            stopCamera();
            setUiPaused(true);
            handleScannedDataValidation(text);
          },
          () => {}
        );
        setIsScanning(true);
      } catch (fallbackErr) {
        // Silently catch the error and update the UI state instead of firing an alert
        console.error("Camera acquisition failure:", fallbackErr);
        setCameraError(true);
      }
    }
  };

  const stopCamera = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Camera failed to stop safely:", err);
      }
    }
  };

  useEffect(() => {
    if (mode === 'priceCheck' && !uiPaused) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };
  }, [mode, uiPaused]);

  const handleSaveProduct = () => {
    if (!scannedProduct) return;
    if (savedProducts.some(p => p.barcode === scannedProduct.barcode)) {
      alert("This product is already in your batch list.");
      return;
    }
    setSavedProducts([{ ...scannedProduct, savedAt: Date.now() }, ...savedProducts]);
    setScannedProduct(null);
    setUiPaused(false);
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-xl overflow-hidden border border-gray-200 shadow-inner min-h-[250px] flex items-center justify-center">
        <div id="reader" className="w-full absolute inset-0"></div>
        
        {isScanning && !uiPaused && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
            <button onClick={stopCamera} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide uppercase shadow-md">
              🛑 Stop Scanning
            </button>
          </div>
        )}
        
        {uiPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl backdrop-blur-xs z-20">
            <button onClick={() => { setScannedProduct(null); setUiPaused(false); }} className="bg-[#004aad] text-white px-6 py-3 rounded-xl font-black uppercase text-sm shadow-xl tracking-wider hover:bg-blue-800 transition-all border border-white/20">
              📷 Scan Next Item
            </button>
          </div>
        )}

        {/* The new silent error state for PC users without a camera */}
        {cameraError && !uiPaused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 rounded-xl z-20 p-4 text-center">
            <p className="text-red-400 font-bold text-[11px] uppercase tracking-wider mb-2">📸 Camera Not Detected</p>
            <p className="text-gray-500 text-[10px] mb-3">Please use the manual entry field below.</p>
            <button onClick={startCamera} className="bg-gray-800 text-gray-300 px-4 py-1.5 rounded-lg font-bold text-[10px] uppercase hover:bg-gray-700 transition-colors">
              Retry Camera
            </button>
          </div>
        )}

        {!isScanning && !uiPaused && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-xl z-20 p-4 text-center">
            <button onClick={startCamera} className="bg-[#004aad] text-white px-6 py-3 rounded-xl font-black uppercase text-sm shadow-md hover:bg-blue-800">
              🎥 Start Scanner
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input type="text" className="flex-grow border px-3 py-2 rounded-lg font-mono text-sm outline-none focus:border-blue-500 text-gray-800 bg-white" placeholder="Scan or Type Barcode" value={manualBarcode} onChange={(e) => setManualBarcode(e.target.value)} />
        <button onClick={() => { handleScannedDataValidation(manualBarcode); setManualBarcode(''); }} className="bg-[#004aad] text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-blue-800">Find</button>
      </div>

      {scannedProduct && (
        <div className={`p-5 rounded-xl border-2 text-center shadow-inner transition-all duration-300 ${scannedProduct.name === "Product Not Found" ? "bg-red-50 border-red-200 text-red-900" : "bg-blue-50 border-blue-200 text-gray-900"}`}>
          <div className="flex justify-between items-center text-[11px] font-mono text-gray-400 mb-2 border-b border-gray-200 pb-1">
            <span>BC: {scannedProduct.barcode}</span>
            <span>CODE: {scannedProduct.productCode}</span>
          </div>
          <h3 className="text-lg font-black uppercase leading-tight mb-2">{scannedProduct.name}</h3>
          <p className="text-4xl font-black text-[#004aad] mb-3">{scannedProduct.price}</p>
          {scannedProduct.name !== "Product Not Found" && (
            <button onClick={handleSaveProduct} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase py-2.5 px-4 rounded-lg shadow-sm tracking-wide transition-all">
              💾 Save to Batch List
            </button>
          )}
        </div>
      )}

      <div className="xl:hidden">
        <SavedBatchList savedProducts={savedProducts} setSavedProducts={setSavedProducts} setActiveZoomBarcode={setActiveZoomBarcode} />
      </div>
    </div>
  );
}