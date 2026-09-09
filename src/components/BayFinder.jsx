import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';

const STORE_SIZES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const SEASONS = ["Mothers Day", "Fathers Day", "Easter", "Halloween", "Xmas", "Garden", "Summer"];

export default function BayFinder({ storeId }) {
  const [storeSize, setStoreSize] = useState(() => localStorage.getItem('onebeyond_store_size') || 'A');
  const [season, setSeason] = useState(() => localStorage.getItem('onebeyond_bayfinder_season') || SEASONS[0]);
  const [manualBarcode, setManualBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [uiPaused, setUiPaused] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [bayResult, setBayResult] = useState(null);
  
  // Tracking State
  const [expectedItems, setExpectedItems] = useState([]);
  const [scannedBarcodes, setScannedBarcodes] = useState([]);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  
  const html5QrcodeRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('onebeyond_store_size', storeSize);
    localStorage.setItem('onebeyond_bayfinder_season', season);
    if (storeId) {
      fetchProgress();
    }
  }, [storeSize, season, storeId]);

  const fetchProgress = async () => {
    if (!storeId) return;
    setIsLoadingProgress(true);
    
    // 1. Fetch expected items for this season
    const { data: planogramData, error: pError } = await supabase
      .from('planogram_items')
      .select('*')
      .eq('season', season);
      
    if (!pError) {
      const validExpected = (planogramData || []).filter(item => item.store_sizes.includes(storeSize));
      setExpectedItems(validExpected);
    }

    // 2. Fetch scanned items for this store & season
    const { data: scanData, error: sError } = await supabase
      .from('store_season_scans')
      .select('barcode')
      .eq('store_id', storeId)
      .eq('season', season);
      
    if (!sError) {
      setScannedBarcodes((scanData || []).map(row => row.barcode));
    }
    
    setIsLoadingProgress(false);
  };

  const playSuccessBeep = () => {
    try {
      if (navigator.vibrate) navigator.vibrate(100);
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'square';
      oscillator.frequency.value = 1050; 
      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime); 
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.08); 
    } catch (err) {}
  };

  const playErrorBeep = () => {
    try {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sawtooth';
      oscillator.frequency.value = 150; 
      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime); 
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2); 
    } catch (err) {}
  };

  const lookupBay = async (barcodeToFind) => {
    const cleanBarcode = barcodeToFind.trim();
    if (!cleanBarcode) return;

    playSuccessBeep();
    stopCamera();
    setUiPaused(true);

    try {
      // Resolve the scanned barcode to its parent product_code
      const { data: productData } = await supabase
        .from('store_products')
        .select('product_code')
        .eq('barcode', cleanBarcode)
        .maybeSingle();

      const targetProductCode = productData?.product_code || cleanBarcode;

      const { data: items, error } = await supabase
        .from('planogram_items')
        .select('*')
        .or(`product_code.eq.${targetProductCode},barcode.eq.${cleanBarcode}`);

      if (error) throw error;

      if (!items || items.length === 0) {
        playErrorBeep();
        setBayResult({ type: 'not_found', barcode: cleanBarcode });
        return;
      }

      const seasonItems = items.filter(i => i.season === season);

      if (seasonItems.length === 0) {
        playErrorBeep();
        const validSeasons = [...new Set(items.map(i => i.season))].filter(Boolean);
        setBayResult({
          type: 'wrong_season',
          barcode: cleanBarcode,
          productName: items[0].product_name,
          validSeasons
        });
        return;
      }

      const matchedItem = seasonItems.find(item => item.store_sizes.includes(storeSize));

      if (matchedItem) {
        setBayResult({
          type: 'success',
          barcode: cleanBarcode,
          productName: matchedItem.product_name,
          bayNumber: matchedItem.bay_number,
        });
        
        // TRACKING: Log it by product_code so ANY barcode clears it
        const trackingCode = matchedItem.product_code || cleanBarcode;
        if (storeId && !scannedBarcodes.includes(trackingCode)) {
          setScannedBarcodes(prev => [...prev, trackingCode]);
          supabase.from('store_season_scans').insert([{ store_id: storeId, season: season, barcode: trackingCode }])
            .then(({error: insertErr}) => {
              if(insertErr) console.error("Failed to log scan:", insertErr);
            });
        }
      } else {
        playErrorBeep();
        setBayResult({
          type: 'wrong_size',
          barcode: cleanBarcode,
          productName: seasonItems[0].product_name,
          validSizes: seasonItems[0].store_sizes
        });
      }

    } catch (err) {
      toast.error(`Database error: ${err.message}`);
      setBayResult(null);
      setUiPaused(false);
    }
  };

  const confirmReset = () => {
    toast((t) => (
      <div className="flex flex-col gap-3 p-1 text-center">
        <span className="text-sm font-bold text-gray-800">Reset progress for {season}?</span>
        <p className="text-[10px] text-gray-500">This will wipe all your store's scans for this season.</p>
        <div className="flex gap-2 justify-center mt-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold uppercase">Cancel</button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              const { error } = await supabase.from('store_season_scans').delete().eq('store_id', storeId).eq('season', season);
              if (!error) {
                toast.success("Progress reset.");
                fetchProgress();
              }
            }} 
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase shadow-md"
          >Reset</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const startCamera = async () => {
    setCameraError(false); 
    setBayResult(null);
    try {
      if (!html5QrcodeRef.current) html5QrcodeRef.current = new Html5Qrcode("bay-reader");
      if (html5QrcodeRef.current.isScanning) return;
      await html5QrcodeRef.current.start(
        { facingMode: { exact: "environment" } }, 
        { fps: 15, qrbox: { width: 260, height: 160 } }, 
        lookupBay, 
        () => {}
      );
      setIsScanning(true);
    } catch (err) {
      try {
        await html5QrcodeRef.current.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 260, height: 160 } }, lookupBay, () => {});
        setIsScanning(true);
      } catch (fallbackErr) {
        setCameraError(true);
      }
    }
  };

  const stopCamera = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        setIsScanning(false);
      } catch (err) {}
    }
  };

  useEffect(() => {
    if (!uiPaused) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };
  }, [uiPaused]);

  const missingItems = expectedItems.filter(item => !scannedBarcodes.includes(item.product_code || item.barcode));
  
  const missingByBay = missingItems.reduce((acc, item) => {
    if (!acc[item.bay_number]) acc[item.bay_number] = [];
    acc[item.bay_number].push(item);
    return acc;
  }, {});

  const progressPercent = expectedItems.length > 0 
    ? Math.round((scannedBarcodes.length / expectedItems.length) * 100) 
    : 0;

  return (
    <div className={`mx-auto ${storeId ? 'max-w-7xl grid grid-cols-1 xl:grid-cols-[450px_1fr] gap-6 items-start' : 'max-w-lg space-y-4'}`}>
      
      {/* SCANNER SIDE */}
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 text-center space-y-2">
          <h2 className="font-black text-gray-800 uppercase tracking-widest text-sm">Planogram Bay Finder</h2>
          <p className="text-xs text-gray-500">Scan seasonal stock to find its designated bay.</p>
          
          <div className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-200 text-left grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-[#004aad] mb-1">Target Season</label>
              <select 
                value={season} 
                onChange={(e) => setSeason(e.target.value)} 
                className="w-full border p-2 rounded bg-white text-xs font-bold text-gray-800 outline-none focus:border-[#004aad]"
              >
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-[#004aad] mb-1">Store Tier</label>
              <select 
                value={storeSize} 
                onChange={(e) => setStoreSize(e.target.value)} 
                className="w-full border p-2 rounded bg-white text-xs font-bold text-gray-800 outline-none focus:border-[#004aad]"
              >
                {STORE_SIZES.map(s => <option key={s} value={s}>Tier {s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="relative bg-black rounded-xl overflow-hidden border border-gray-200 shadow-inner min-h-[250px] flex items-center justify-center">
          <div id="bay-reader" className="w-full absolute inset-0"></div>
          
          {isScanning && !uiPaused && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
              <button onClick={stopCamera} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide uppercase shadow-md">
                🛑 Stop Scanning
              </button>
            </div>
          )}
          
          {uiPaused && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl backdrop-blur-xs z-20">
              <button onClick={() => { setBayResult(null); setUiPaused(false); }} className="bg-[#004aad] text-white px-6 py-3 rounded-xl font-black uppercase text-sm shadow-xl tracking-wider hover:bg-blue-800 transition-all border border-white/20">
                📷 Scan Next Item
              </button>
            </div>
          )}

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
          <input 
            type="text" 
            className="flex-grow border px-3 py-2 rounded-lg font-mono text-sm outline-none focus:border-[#004aad] text-gray-800 bg-white" 
            placeholder="Scan or Type Barcode" 
            value={manualBarcode} 
            onChange={(e) => setManualBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                lookupBay(manualBarcode);
                setManualBarcode('');
              }
            }}
          />
          <button onClick={() => { lookupBay(manualBarcode); setManualBarcode(''); }} className="bg-[#004aad] text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-blue-800">Find</button>
        </div>

        {bayResult && (
          <div className={`p-5 rounded-xl border-2 text-center shadow-inner transition-all duration-300 ${
            bayResult.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 
            (bayResult.type === 'wrong_size' || bayResult.type === 'wrong_season') ? 'bg-orange-50 border-orange-200 text-orange-900' :
            'bg-red-50 border-red-200 text-red-900'
          }`}>
            <div className="text-[11px] font-mono text-gray-500 mb-2 border-b border-gray-200 pb-1 uppercase font-bold tracking-widest">
              Barcode: {bayResult.barcode}
            </div>

            {bayResult.type === 'success' && (
              <>
                <h3 className="text-sm font-black uppercase mb-1 text-gray-600">{bayResult.productName || 'Unnamed Item'}</h3>
                <p className="text-xs uppercase font-bold mt-3 mb-1 tracking-widest text-emerald-600">Designated Bay</p>
                <p className="text-6xl font-black text-[#004aad] drop-shadow-sm">{bayResult.bayNumber}</p>
                {storeId && <p className="text-[10px] font-bold text-emerald-600 mt-3 uppercase">✓ Logged as Found</p>}
              </>
            )}

            {bayResult.type === 'wrong_season' && (
              <>
                <h3 className="text-sm font-black uppercase mb-2 text-gray-800">{bayResult.productName || 'Unnamed Item'}</h3>
                <p className="text-xl font-black text-orange-600 mb-2">NOT IN THIS SEASON</p>
                <p className="text-xs font-bold text-gray-600">
                  This item is mapped to a different season: <br/>
                  <span className="text-orange-800">{bayResult.validSeasons.join(', ')}</span>
                </p>
              </>
            )}

            {bayResult.type === 'wrong_size' && (
              <>
                <h3 className="text-sm font-black uppercase mb-2 text-gray-800">{bayResult.productName || 'Unnamed Item'}</h3>
                <p className="text-xl font-black text-orange-600 mb-2">NOT FOR TIER {storeSize}</p>
                <p className="text-xs font-bold text-gray-600">
                  This item is only part of the planogram for: <br/>
                  <span className="text-orange-800">Tier {bayResult.validSizes.join(', ')} Stores</span>
                </p>
              </>
            )}

            {bayResult.type === 'not_found' && (
              <>
                <p className="text-xl font-black text-red-600 mb-2">NOT IN PLANOGRAM</p>
                <p className="text-xs font-bold text-gray-600">This barcode has not been assigned to a seasonal bay by Head Office.</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* TRACKING PROGRESS SIDE (Only for logged in stores) */}
      {storeId && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col h-full min-h-[500px]">
          
          <div className="p-5 bg-gray-50 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Setup Progress</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase">{season} • Tier {storeSize}</p>
              </div>
              <button 
                onClick={confirmReset}
                className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
              >
                Reset Progress
              </button>
            </div>
            
            <div>
              <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] font-black uppercase text-gray-500">Completion</span>
                <span className="text-lg font-black text-[#004aad]">{progressPercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div className="bg-[#004aad] h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <p className="text-[10px] font-bold text-gray-400 text-center mt-2 uppercase">
                {scannedBarcodes.length} of {expectedItems.length} items logged
              </p>
            </div>
          </div>

          <div className="p-4 flex-grow overflow-y-auto bg-gray-50/50 max-h-[600px]">
            {isLoadingProgress ? (
              <div className="text-center py-10 text-gray-400 font-bold uppercase text-xs animate-pulse">Syncing Tracker...</div>
            ) : expectedItems.length === 0 ? (
              <div className="text-center py-10 text-gray-400 font-bold text-xs">No expected items for this season and tier.</div>
            ) : missingItems.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center">
                <span className="text-4xl mb-2">🎉</span>
                <p className="font-black text-emerald-600 uppercase tracking-widest text-lg">Season Complete!</p>
                <p className="text-xs font-bold text-gray-500 mt-1">You have successfully found all items.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-orange-600 uppercase tracking-wider mb-2 border-b pb-1">Missing Items ({missingItems.length})</h4>
                {Object.keys(missingByBay).sort().map(bay => (
                  <div key={bay} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-[#004aad] text-white px-4 py-2 flex justify-between items-center">
                      <span className="font-black uppercase tracking-widest text-sm">{bay}</span>
                      <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded">Missing: {missingByBay[bay].length}</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {missingByBay[bay].map(item => (
                        <div key={item.id} className="p-3 hover:bg-orange-50/30 transition-colors flex justify-between items-center gap-2">
                          <div>
                            <div className="font-bold text-gray-800 text-xs">{item.product_name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {item.product_code && <span className="font-black text-[#004aad] text-[10px]">CODE: {item.product_code}</span>}
                              <span className="font-mono text-gray-400 text-[10px]">{item.barcode}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
