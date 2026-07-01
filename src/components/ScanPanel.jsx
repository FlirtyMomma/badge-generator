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

  // CORE INTERCEPT: Multi-stage unique pallet identification & destination auto-increment transfer
  const handleScannedDataValidation = async (text) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    if (cleanText.startsWith("HUB_TRANSFER:")) {
      playSuccessBeep();
      stopCamera();
      setUiPaused(true);

      // 1. HARD SECURITY CHECK: Block unsigned terminals from executing modifications
      if (!session || !storeId || !session.user?.id) {
        alert("Access Denied: You must be logged into a valid store terminal node to process stock transfers.");
        setScannedProduct(null);
        setUiPaused(false);
        return;
      }

      // Parse out our composite unique token signature keys
      const [_, transferId, season, originalPalletNum, globalPalletKey] = cleanText.split(":");
      const sourcePalletLookupKey = globalPalletKey || `${season.replace(/\s+/g, '').toUpperCase()}-P${originalPalletNum}`;

      // 2. LIVE OWNERSHIP VALIDATION: Check if this specific composite pallet key exists in the database
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

      // If the pallet doesn't exist in the database yet, initialize it on the fly
      if (!activePalletRecord) {
        const confirmAutoCreate = window.confirm(
          `PALLET REGISTRY NOT FOUND\n\nPallet ${originalPalletNum} is not registered in the database yet.\n\nWould you like to auto-initialize this record entry now?`
        );

        if (!confirmAutoCreate) {
          setScannedProduct(null);
          setUiPaused(false);
          return;
        }

        const { data: newPallet, error: insertError } = await supabase
          .from('store_pallets')
          .insert({ pallet_id: sourcePalletLookupKey, current_owner_store_id: 'INITIAL_MANIFEST_ORIGIN' })
          .select('current_owner_store_id')
          .single();

        if (insertError) {
          alert(`Registry Initialization Failed: ${insertError.message}`);
          setScannedProduct(null);
          setUiPaused(false);
          return;
        }
        activePalletRecord = newPallet;
      }

      // 3. REDUNDANCY SAFEGUARD: Block operations if your store already owns this exact season container tracking code
      if (activePalletRecord.current_owner_store_id === storeId) {
        alert(`Operation Cancelled: Store ${storeId} already holds the active registration for this seasonal stock container configuration.`);
        setScannedProduct(null);
        setUiPaused(false);
        return;
      }

      // 4. AUTO-INCREMENT CALCULATOR: Find the highest sequence number the receiving store owns for this season
      const cleanSeasonTag = season.replace(/\s+/g, '').toUpperCase();
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
        `STOCK MANIFEST VALIDATED\n\nIncoming: ${season} (Originally Pallet ${originalPalletNum})\nDestination: Store ${storeId}\n\nAction: This stock will be appended as a brand new Pallet record entry: "Pallet ${nextPalletNum}" under your store holdings.\n\nExecute database ownership transfer?`
      );

      if (confirmReceipt) {
        // 5. TRANSACTION ENGINE PHASE 1: Update/Upsert the master pallet container row
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

        // PHASE 2: Re-allocate item lines inside public.legacy_stock_counts
        // Shifts the record to the target unique pallet key and signs it to the active terminal user UUID
        const { error: inventoryError } = await supabase
          .from('legacy_stock_counts')
          .update({ 
            user_id: session.user.id, // Reassigns user ownership to current terminal
            pallet_number: destinationPalletKey 
          })
          .eq('pallet_number', sourcePalletLookupKey);

        if (inventoryError) {
          alert(`Pallet tracking registry initialized, but underlying item balances failed to re-allocate: ${inventoryError.message}`);
        } else {
          alert(`Success! Stock allocation has been added to Store ${storeId} database totals as Pallet ${nextPalletNum}.`);
        }
      }
      
      setScannedProduct(null);
      setUiPaused(false);
      return;
    }

    lookUpProduct(cleanText);
  };

  const startCamera = async () => {
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
        console.error("Absolute camera acquisition failure across all sensors:", fallbackErr);
        alert("Camera Initialization Failure: Please verify that rear camera usage permissions are explicitly granted.");
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
      <div className="relative bg-black rounded-xl overflow-hidden border border-gray-200 shadow-inner">
        <div id="reader" className="w-full"></div>
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
        {!isScanning && !uiPaused && (
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