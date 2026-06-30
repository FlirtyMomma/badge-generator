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

  const [viewSeason, setViewSeason] = useState('Mothers Day');
  const [viewPallet, setViewPallet] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const seasonsList = ["Mothers Day", "Fathers Day", "Easter", "Halloween", "Xmas", "Garden", "Summer"];

  // --- NEW: NATIVE HARDWARE AUDIO FEEDBACK OVERRIDE ---
  const playSuccessBeep = () => {
      try {
        // 1. Fire a sharp 100-millisecond physical hardware vibration pulse
        if (navigator.vibrate) {
          navigator.vibrate(100);
        }

        // 2. Play the piercing square-wave audio tone
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
        console.warn("Hardware feedback context blocked or uninitialised:", err);
      }
    };

  useEffect(() => {
    setViewSeason(season);
  }, [season]);

  const fetchStoreSeasonCounts = async () => {
    if (!session?.user?.id) return;

    // Pull raw counts directly without letting an empty product link wipe out the row
    const { data: countsData, error: countsError } = await supabase
      .from('legacy_stock_counts')
      .select('id, created_at, pallet_number, barcode, product_name, quantity')
      .eq('user_id', session.user.id)
      .eq('season_type', viewSeason)
      .order('created_at', { ascending: false });

    if (countsError) {
      console.error("Fetch failure:", countsError.message);
      return;
    }

    if (countsData) {
      const uniqueBarcodes = [...new Set(countsData.map(item => item.barcode))];
      let priceMap = {};

      if (uniqueBarcodes.length > 0) {
        const { data: productsData } = await supabase
          .from('store_products')
          .select('barcode, price')
          .in('barcode', uniqueBarcodes);

        if (productsData) {
          productsData.forEach(p => { priceMap[p.barcode] = p.price; });
        }
      }

      const formattedData = countsData.map(item => {
        const livePriceString = priceMap[item.barcode] || "£0.00";
        const parsedPrice = parseFloat(livePriceString.replace(/[^0-9.]/g, '')) || 0;
        return { ...item, livePriceString, parsedPrice };
      });

      setSessionList(formattedData);
    }
  };

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchStoreSeasonCounts();

    const channel = supabase
      .channel(`legacy_sync_${session.user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'legacy_stock_counts',
        filter: `user_id=eq.${session.user.id}`
      }, () => {
        fetchStoreSeasonCounts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [viewSeason, session]);

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
          videoConstraints: { width: { ideal: 1920, min: 1080 }, height: { ideal: 1080, min: 720 }, facingMode: "environment" }
        },
        (text) => {
          // --- UPDATED: Fires the physical hardware notification tone instantly ---
          playSuccessBeep();
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
    if (html5QrcodeRef.current && isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Legacy camera failed to stop safely:", err);
      }
    }
  };

  useEffect(() => {
    if (mode === 'legacy' && !uiPaused) startCamera();
    else stopCamera();
    return () => { stopCamera(); };
  }, [mode, uiPaused]);

  const handleCommitItem = async (e) => {
    e.preventDefault();
    if (!scannedProduct || !quantity || parseInt(quantity) <= 0) return;

    setIsSubmitting(true);
    const targetQuantity = parseInt(quantity);
    const cleanPallet = pallet.trim();

    const { data: existingRecords, error: checkError } = await supabase
      .from('legacy_stock_counts')
      .select('id, quantity')
      .eq('user_id', session.user.id)
      .eq('season_type', season)
      .eq('pallet_number', cleanPallet)
      .eq('barcode', scannedProduct.barcode);

    if (checkError) {
      alert("Database lookup error.");
      setIsSubmitting(false);
      return;
    }

    let saveError = null;

    if (existingRecords && existingRecords.length > 0) {
      const existingItem = existingRecords[0];
      const combinedQuantity = existingItem.quantity + targetQuantity;

      const { error } = await supabase
        .from('legacy_stock_counts')
        .update({ quantity: combinedQuantity })
        .eq('id', existingItem.id);
      
      saveError = error;
    } else {
      const newRecord = {
        user_id: session.user.id,
        season_type: season,
        pallet_number: cleanPallet,
        barcode: scannedProduct.barcode,
        product_name: scannedProduct.name,
        quantity: targetQuantity
      };

      const { error } = await supabase.from('legacy_stock_counts').insert([newRecord]);
      saveError = error;
    }

    if (!saveError) {
      setScannedProduct(null);
      setQuantity('1');
      setUiPaused(false);
    } else {
      alert("Database error saving item.");
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

  const uniquePalletsInSeason = ['All', ...new Set(sessionList.map(item => item.pallet_number))].sort((a, b) => a - b);

  const filteredDisplayList = sessionList.filter(item => {
    const matchesPallet = viewPallet === 'All' || item.pallet_number === viewPallet;
    const cleanQuery = searchQuery.trim().toLowerCase();
    return matchesPallet && (!cleanQuery || item.product_name.toLowerCase().includes(cleanQuery) || item.barcode.includes(cleanQuery));
  });

  const filteredPalletValue = filteredDisplayList.reduce((acc, item) => acc + (item.parsedPrice * item.quantity), 0);
  const grandSeasonValue = sessionList.reduce((acc, item) => acc + (item.parsedPrice * item.quantity), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
        <div>
          <label className="block text-[10px] font-black uppercase text-[#004aad] mb-1">Scan Season</label>
          <select value={season} onChange={e => setSeason(e.target.value)} className="w-full border p-2 rounded bg-white text-xs font-bold text-gray-700 outline-none">
            {seasonsList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black uppercase text-[#004aad] mb-1">Active Pallet #</label>
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
        <input type="text" className="flex-grow border px-3 py-2 rounded-lg font-mono text-sm outline-none focus:border-blue-500" placeholder="Scan or Type Barcode" value={manualBarcode} onChange={(e) => setManualBarcode(e.target.value)} />
        <button onClick={() => { lookUpProduct(manualBarcode); setManualBarcode(''); }} className="bg-[#004aad] text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-blue-800">Find</button>
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
        <div className="bg-gray-100 p-3 rounded-xl border border-gray-200 mb-3 space-y-2.5">
          <span className="block text-[10px] font-black uppercase text-gray-500 tracking-wider">🔍 Audit Viewer Filters</span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-bold text-gray-400 mb-0.5">View Season</label>
              <select value={viewSeason} onChange={e => { setViewSeason(e.target.value); setViewPallet('All'); }} className="w-full border p-1.5 rounded bg-white text-xs font-bold text-gray-700 outline-none">
                {seasonsList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-bold text-gray-400 mb-0.5">View Pallet</label>
              <select value={viewPallet} onChange={e => setViewPallet(e.target.value)} className="w-full border p-1.5 rounded bg-white text-xs font-bold text-gray-700 outline-none">
                {uniquePalletsInSeason.map(plt => <option key={plt} value={plt}>{plt === 'All' ? 'All Pallets' : `Pallet ${plt}`}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-bold text-gray-400 mb-0.5">Find Item (Name / Barcode)</label>
            <div className="relative">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Type keywords..." className="w-full border p-2 pr-7 rounded bg-white text-xs font-medium text-gray-800 outline-none focus:border-blue-500 shadow-xs" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px] font-bold">✕</button>}
            </div>
          </div>
        </div>

        <div className="space-y-1 bg-white p-3 rounded-xl border border-gray-200 mb-3 shadow-xs">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-gray-500 uppercase">Season Total Value:</span>
            <span className="font-black text-[#004aad] text-sm">£{grandSeasonValue.toFixed(2)}</span>
          </div>
          {viewPallet !== 'All' && (
            <div className="flex justify-between items-center text-xs pt-1 border-t border-dashed border-gray-100">
              <span className="font-bold text-gray-500 uppercase">Pallet {viewPallet} Value:</span>
              <span className="font-black text-emerald-600">£{filteredPalletValue.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-2 px-1">
          <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider">Logged Items ({filteredDisplayList.length})</h3>
          <span className="text-[10px] font-mono text-gray-400 bg-gray-200 px-2 py-0.5 rounded-sm font-bold">Items: {filteredDisplayList.reduce((acc, item) => acc + item.quantity, 0)}</span>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {filteredDisplayList.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-6 italic bg-white rounded-lg border border-dashed">No product entries logged.</p>
          ) : (
            filteredDisplayList.map((item) => (
              <div key={item.id} onClick={() => handleUpdateQuantity(item.id, item.quantity)} className="bg-white border border-gray-200 rounded-lg p-2.5 flex justify-between items-center shadow-xs cursor-pointer hover:bg-orange-50 hover:border-orange-200 group transition-colors">
                <div className="min-w-0 pr-2">
                  <h4 className="text-xs font-bold text-gray-900 truncate uppercase">{item.product_name}</h4>
                  <div className="text-[9px] font-mono text-gray-400 mt-0.5 flex gap-3">
                    <span>PLT: <strong className="text-[#004aad] font-black">{item.pallet_number}</strong></span>
                    <span>BC: {item.barcode}</span>
                    <span>Live Each: <strong className="text-gray-600">{item.livePriceString}</strong></span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                  <span className="bg-[#004aad] text-white px-2.5 py-0.5 rounded text-xs font-black group-hover:bg-orange-600">x{item.quantity}</span>
                  <span className="text-[10px] font-bold text-gray-500">£{(item.parsedPrice * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}