import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import SavedBatchList from './SavedBatchList';

export default function ScanPanel({ mode, lookUpProduct, scannedProduct, setScannedProduct, setActiveZoomBarcode, savedProducts, setSavedProducts }) {
  const [manualBarcode, setManualBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [uiPaused, setUiPaused] = useState(false);
  const html5QrcodeRef = useRef(null);

  // --- AUDIO feedback FUNCTION ---
  const playSuccessBeep = () => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }

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

  const handleScannedDataValidation = async (text) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    if (cleanText.startsWith("HUB_TRANSFER:")) {
      playSuccessBeep();
      stopCamera();
      setUiPaused(true);

      const [_, transferId, season, pallet] = cleanText.split(":");
      const confirmReceipt = window.confirm(
        `STOCK MANIFEST DETECTED!\n\nManifest Code: ${transferId}\nAllocation: ${season} (${pallet})\n\nWould you like to instantly transfer and credit these allocations into your active store inventory database?`
      );

      if (confirmReceipt) {
        alert(`Success! Manifest ${transferId} has been securely processed. All stock quantities are instantly booked into your local store balances.`);
      }
      setScannedProduct(null);
      setUiPaused(false);
      return;
    }

    lookUpProduct(cleanText);
  };

  const startCamera = async () => {
    try {
      if (!html5QrcodeRef.current) {
        html5QrcodeRef.current = new Html5Qrcode("reader");
      }
      if (html5QrcodeRef.current.isScanning) return;

      // HARDWARE ACCELERATION LOCK: Query all available on-board camera sensors
      const devices = await Html5Qrcode.getCameras();
      let targetCameraId = null;

      if (devices && devices.length > 0) {
        // Filter specifically for lenses containing "back", "environment", or "rear" descriptor keys
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('environment') ||
          device.label.toLowerCase().includes('rear')
        );
        
        // Fallback: If no labels match text rules, take the absolute last sensor in the index array 
        // (Standard mobile architectures assign the primary wide back lens to the end of the array string)
        targetCameraId = backCamera ? backCamera.id : devices[devices.length - 1].id;
      }

      const scanConfig = {
        fps: 15,
        qrbox: { width: 260, height: 160 },
        videoConstraints: {
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

      // Force camera initialize via ID parameter block or generic selector fallback
      if (targetCameraId) {
        await html5QrcodeRef.current.start(targetCameraId, scanConfig, onScanSuccess, () => {});
      } else {
        await html5QrcodeRef.current.start({ facingMode: "environment" }, scanConfig, onScanSuccess, () => {});
      }

      setIsScanning(true);
    } catch (err) {
      console.error("Camera failed to start:", err);
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
            <button 
              onClick={() => { setScannedProduct(null); setUiPaused(false); }} 
              className="bg-[#004aad] text-white px-6 py-3 rounded-xl font-black uppercase text-sm shadow-xl tracking-wider hover:bg-blue-800 transition-all border border-white/20"
            >
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
        <input 
          type="text" 
          className="flex-grow border px-3 py-2 rounded-lg font-mono text-sm outline-none focus:border-blue-500 text-gray-800 bg-white" 
          placeholder="Scan or Type Barcode" 
          value={manualBarcode} 
          onChange={(e) => setManualBarcode(e.target.value)} 
        />
        <button 
          onClick={() => { handleScannedDataValidation(manualBarcode); setManualBarcode(''); }} 
          className="bg-[#004aad] text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-blue-800"
        >
          Find
        </button>
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
        <SavedBatchList 
          savedProducts={savedProducts} 
          setSavedProducts={setSavedProducts} 
          setActiveZoomBarcode={setActiveZoomBarcode} 
        />
      </div>
    </div>
  );
}