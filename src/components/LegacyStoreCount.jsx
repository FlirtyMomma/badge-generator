import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../supabaseClient';

export default function LegacyStoreCount({ mode, session, lookUpProduct, scannedProduct, setScannedProduct }) {
  const [season, setSeason] = useState('Mothers Day');
  const [pallet, setPallet] = useState(() => localStorage.getItem(`onebeyond_last_pallet_${session?.user.id}`) || '1');
  const [quantity, setQuantity] = useState('1');
  const [manualBarcode, setManualBarcode] = useState('');
  
  const [isScanning, setIsScanning] = useState(false);
  const [uiPaused, setUiPaused] = useState(false);
  const html5QrcodeRef = useRef(null);

  const [sessionList, setSessionList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const seasonsList = ["Mothers Day", "Fathers Day", "Easter", "Halloween", "Xmas", "Garden", "Summer"];

  useEffect(() => {
    if (session) fetchStoreSeasonCounts();
  }, [season, session]);

  useEffect(() => {
    if (session) localStorage.setItem(`onebeyond_last_pallet_${session.user.id}`, pallet);
  }, [pallet, session]);

  const startCamera = async () => {
    try {
      if (!html5QrcodeRef.current) html5QrcodeRef.current = new Html5Qrcode("legacy-reader");
      if (html5QrcodeRef.current.isScanning) return;

      await html5QrcodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 260, height: 160 },
          videoConstraints: {
            width: { ideal: 1920, min: 1080 },
            height: { ideal: 1080, min: 720 },
            facingMode: "environment"
          }
        },
        (text) => {
          // Locks stream matching standard core scanning mechanics
          stopCamera();
          setUiPaused(true);
          lookUpProduct(text);
        },
        () => {}
      );
      setIsScanning(true);
    } catch (err) {
      console.error(err);
    }
  };

  const stopCamera = async () => {
// Fixes the camera boot hook to watch the tab 'mode' and 'uiPaused' states
    useEffect(() => {
        if (mode === 'legacy' && !uiPaused) {
        startCamera();
        } else {
        stopCamera();
        }
        return () => {
        stopCamera();
        };
    }, [mode, uiPaused]);
  };

  useEffect(() => {
    if (mode === 'legacy' && !uiPaused) startCamera();
    else stopCamera();
    return () => { stopCamera(); };
  }, [mode, uiPaused]);

  const fetchStoreSeasonCounts = async () => {
    const { data } = await supabase
      .from('legacy_stock_counts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('season_type', season)
      .order('created_at', { ascending: false });

    if (data) setSessionList(data);
  };

  const handleCommitItem = async (e) => {
    e.preventDefault();
    if (!scannedProduct || !quantity || parseInt(quantity) <= 0) return;

    setIsSubmitting(true);
    const newRecord = {
      user_id: session.user.id,
      season_type: season,
      pallet_number: pallet,
      barcode: scannedProduct.barcode,
      product_name: scannedProduct.name,
      quantity: parseInt(quantity)
    };

    const { error } = await supabase.from('legacy_stock_counts').insert([newRecord]);

    if (!error) {
      setScannedProduct(null);
      setQuantity('1');
      setUiPaused(false);
      fetchStoreSeasonCounts();
    } else {
      alert("Database error.");
    }
    setIsSubmitting(false);
  };

  const handleUpdateQuantity = async (id, currentQty) => {
    const newQty = prompt("Enter corrected quantity standard:", currentQty);
    if (newQty === null) return;
    const parsed = parseInt(newQty);
    
    if (!isNaN(parsed) && parsed >= 0) {
      if (parsed === 0) {
        await supabase.from('legacy_stock_counts').delete().eq('id', id);
      } else {
        await supabase.from('legacy_stock_counts').update({ quantity: parsed }).eq('id', id);
      }
      fetchStoreSeasonCounts();
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
        <div>
          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Season Target</label>
          <select value={season} onChange={e => setSeason(e.target.value)} className="w-full border p-2 rounded bg-white text-xs font-bold text-gray-700 outline-none">
            {seasonsList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Pallet Reference</label>
          <input type="text" value={pallet} onChange={e => setPallet(e.target.value)} className="w-full border p-2 rounded bg-white text-xs font-bold text-gray-700 text-center outline-none" />
        </div>
      </div>

      <div className="relative bg-black rounded-xl overflow-hidden border border-gray-200 shadow-inner">
        <div id="legacy-reader" className="w-full"></div>
        {isScanning && !uiPaused && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
            <button onClick={stopCamera} className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase shadow-md">🛑 Stop Scanning</button>
          </div>
        )}
        {uiPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl z-20">
            <button onClick={() => { setScannedProduct(null); setUiPaused(false); }} className="bg-[#004aad] text-white px-6 py-3 rounded-xl font-black uppercase text-sm shadow-xl">📷 Scan Next Item</button>
          </div>
        )}
        {!isScanning && !uiPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-xl z-20 p-4 text-center">
            <button onClick={startCamera} className="bg-[#004aad] text-white px-6 py-3 rounded-xl font-black uppercase text-sm shadow-md">🎥 Start Scanner</button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input type="text" className="flex-grow border px-3 py-2 rounded-lg font-mono text-sm outline-none" placeholder="Scan or Type Barcode" value={manualBarcode} onChange={(e) => setManualBarcode(e.target.value)} />
        <button onClick={() => { lookUpProduct(manualBarcode); setManualBarcode(''); }} className="bg-[#004aad] text-white px-5 py-2 rounded-lg font-bold text-sm">Find</button>
      </div>

      {scannedProduct && (
        <form onSubmit={handleCommitItem} className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-center space-y-3">
          <div>
            <h4 className="text-xs font-black uppercase text-gray-400">Barcode Identified</h4>
            <h3 className="text-sm font-black text-gray-900 uppercase truncate px-2">{scannedProduct.name}</h3>
          </div>
          <div className="flex items-center justify-center gap-3 max-w-[200px] mx-auto">
            <label className="text-xs font-bold text-gray-600 uppercase">Qty:</label>
            <input type="number" min="1" required value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full border p-2 rounded-lg text-center text-base font-black text-gray-900 focus:border-emerald-500 outline-none bg-white shadow-sm" />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 text-white text-xs font-black uppercase py-2.5 rounded-lg shadow-md tracking-wider">
            {isSubmitting ? 'Saving...' : '✓ Log & Save Item'}
          </button>
        </form>
      )}

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-2">Logged Audit ({sessionList.length})</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {sessionList.map((item) => (
            <div key={item.id} onClick={() => handleUpdateQuantity(item.id, item.quantity)} className="bg-white border border-gray-200 rounded-lg p-2.5 flex justify-between items-center shadow-xs cursor-pointer hover:bg-orange-50 hover:border-orange-200 group transition-colors">
              <div className="min-w-0 pr-2">
                <h4 className="text-xs font-bold text-gray-900 truncate uppercase">{item.product_name}</h4>
                <div className="text-[9px] font-mono text-gray-400 mt-0.5 flex gap-3">
                  <span>PLT: <strong className="text-gray-700">{item.pallet_number}</strong></span>
                  <span>BC: {item.barcode}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="bg-[#004aad] text-white px-2.5 py-1 rounded text-xs font-black group-hover:bg-orange-600">x{item.quantity}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}