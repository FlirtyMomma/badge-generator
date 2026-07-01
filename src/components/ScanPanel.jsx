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

  // CORE INTERCEPT: Validates and runs live stock transfer queries with auto-provisioning
  const handleScannedDataValidation = async (text) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    if (cleanText.startsWith("HUB_TRANSFER:")) {
      playSuccessBeep();
      stopCamera();
      setUiPaused(true);

      // 1. HARD SECURITY CHECK: Block unsigned terminals from executing modifications
      if (!session || !storeId) {
        alert("Access Denied: You must be logged into a valid store terminal node to process stock transfers.");
        setScannedProduct(null);
        setUiPaused(false);
        return;
      }

      const [_, transferId, season, pallet] = cleanText.split(":");

      // 2. LIVE OWNERSHIP VALIDATION: Fetch or automatically register the pallet if it's missing
      let activePalletRecord = null;
      try {
        const { data, error: fetchError } = await supabase
          .from('store_pallets')
          .select('current_owner_store_id')
          .eq('pallet_id', pallet)
          .maybeSingle(); // Refined from .single() so missing rows don't cause hard exceptions

        if (fetchError) throw fetchError;
        activePalletRecord = data;
      } catch (err) {
        alert(`Transfer Error: Unable to query the pallet registry database. (${err.message})`);
        setScannedProduct(null);
        setUiPaused(false);
        return;
      }

      // If the pallet doesn't exist in the database yet, initialize it on the fly
      if (!activePalletRecord) {
        const confirmAutoCreate = window.confirm(
          `PALLET REGISTRY NOT FOUND\n\nPallet ${pallet} is not registered in the database yet.\n\nWould you like to auto-initialize this record entry now?`
        );

        if (!confirmAutoCreate) {
          setScannedProduct(null);
          setUiPaused(false);
          return;
        }

        // Set initial owner as a placeholder or inferred origin, which will then immediately be transferred
        const { data: newPallet, error: insertError } = await supabase
          .from('store_pallets')
          .insert({ pallet_id: pallet, current_owner_store_id: 'INITIAL_MANIFEST_ORIGIN' })
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

      // 3. REDUNDANCY SAFEGUARD: Block operations if your store already owns the pallet
      if (activePalletRecord.current_owner_store_id === storeId) {
        alert(`Operation Cancelled: Store ${storeId} already holds the active registration for Pallet ${pallet}. Transfer redundant.`);
        setScannedProduct(null);
        setUiPaused(false);
        return;
      }

      const confirmReceipt = window.confirm(
        `STOCK MANIFEST VALIDATED\n\nManifest Code: ${transferId}\nAllocation: ${season} (Pallet ${pallet})\nCurrent Owner: ${activePalletRecord.current_owner_store_id}\nNew Owner Destination: ${storeId}\n\nExecute database ownership transfer query?`
      );

      if (confirmReceipt) {
        // 4. LIVE TRANSACTION SQL RUN: Update the record row properties to credit your current store location
        const { error: updateError } = await supabase
          .from('store_pallets')
          .update({ 
            current_owner_store_id: storeId,
            last_transferred_at: new Date().toISOString(),
            manifest_origin_code: transferId
          })
          .eq('pallet_id', pallet);

        if (updateError) {
          alert(`Database Write Rejection: ${updateError.message}`);
        } else {
          alert(`Success! Pallet ${pallet} has been transferred to Store ${storeId} in the database.`);
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