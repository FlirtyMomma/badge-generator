import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminLegacyDashboard() {
  const [masterList, setMasterList] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('All');
  const [selectedSeason, setSelectedSeason] = useState('All');
  const [selectedPallet, setSelectedPallet] = useState('All');
  const [loading, setLoading] = useState(true);
  
  // DIAGNOSTIC STATE FIELDS
  const [diagnosticLog, setDiagnosticLog] = useState('');
  const [rawCountsCount, setRawCountsCount] = useState(0);

  const seasonsList = ["Mothers Day", "Fathers Day", "Easter", "Halloween", "Xmas", "Garden", "Summer"];

  useEffect(() => {
    fetchAllStoreData();
  }, []);

  const fetchAllStoreData = async () => {
    setLoading(true);
    let logStr = "--- System Diagnostics ---\n";

    // TEST 1: Pull raw counts with zero relational joins
    const { data: rawCounts, error: err1 } = await supabase
      .from('legacy_stock_counts')
      .select('*');

    if (err1) {
      logStr += `❌ Test 1 Failed (Raw Select Error): ${err1.message}\n`;
    } else {
      logStr += `✅ Test 1 Passed: Found ${rawCounts?.length || 0} rows in legacy_stock_counts table.\n`;
      setRawCountsCount(rawCounts?.length || 0);
    }

    // TEST 2: Check active user identity
    const { data: authUser } = await supabase.auth.getUser();
    if (authUser?.user) {
      logStr += `👤 Active Admin Auth ID: ${authUser.user.id}\n`;
      
      // TEST 3: Check if this user is actually an admin in store_profiles
      const { data: profile, error: err3 } = await supabase
        .from('store_profiles')
        .select('*')
        .eq('id', authUser.user.id)
        .single();

      if (err3) {
        logStr += `❌ Test 3 Failed (Profile Look-up Error): ${err3.message}\n`;
      } else {
        logStr += `📊 Profile row matches: StoreID: ${profile.store_id}, IsAdmin: ${profile.is_admin}\n`;
      }
    } else {
      logStr += `❌ Active Auth ID: No user session found.\n`;
    }

    setDiagnosticLog(logStr);

    // FIXED: Removed strict relational constraints by decoupling the query 
    // or processing it safely without letting missing barcodes drop rows.
    const { data, error } = await supabase
      .from('legacy_stock_counts')
      .select(`
        id,
        created_at,
        pallet_number,
        barcode,
        product_name,
        quantity,
        season_type,
        user_id,
        store_profiles ( store_id, store_name )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      logStr += `❌ Relational query failure: ${error.message}\n`;
    }

    if (data) {
      // Fetch corresponding prices manually to guarantee no rows are dropped by inner joins
      const uniqueBarcodes = [...new Set(data.map(item => item.barcode))];
      let priceMap = {};

      if (uniqueBarcodes.length > 0) {
        const { data: prices } = await supabase
          .from('store_products')
          .select('barcode, price')
          .in('barcode', uniqueBarcodes);
        
        if (prices) {
          prices.forEach(p => { priceMap[p.barcode] = p.price; });
        }
      }

      const formatted = data.map(item => {
        const livePriceString = priceMap[item.barcode] || "£0.00";
        const parsedPrice = parseFloat(livePriceString.replace(/[^0-9.]/g, '')) || 0;
        
        const displayStoreId = item.store_profiles?.store_id || 'ADMIN';
        const displayStoreName = item.store_profiles?.store_name || 'Corporate Headquarters';

        return {
          ...item,
          storeId: displayStoreId,
          storeName: displayStoreName,
          livePriceString,
          parsedPrice,
          totalItemValue: parsedPrice * item.quantity
        };
      });

      setMasterList(formatted);

      const uniqueStores = [...new Set(formatted.map(item => item.storeId))].sort();
      setStores(uniqueStores);
      
      logStr += `✅ Render complete: Processed ${formatted.length} rows onto screen data grid.\n`;
    }
    setDiagnosticLog(logStr);
    setLoading(false);
  };

  const filteredData = masterList.filter(item => {
    const matchesStore = selectedStore === 'All' || item.storeId === selectedStore;
    const matchesSeason = selectedSeason === 'All' || item.season_type === selectedSeason;
    const matchesPallet = selectedPallet === 'All' || item.pallet_number === selectedPallet;
    return matchesStore && matchesSeason && matchesPallet;
  });

  const grandTotalValue = filteredData.reduce((acc, item) => acc + item.totalItemValue, 0);
  const totalItemsCount = filteredData.reduce((acc, item) => acc + item.quantity, 0);

  if (loading) return <div className="text-center p-6 text-xs font-bold text-gray-400">Loading master network audits...</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-4 no-print">
      
      {/* DIAGNOSTIC PANEL COMPONENT */}
      <div className="bg-slate-900 text-emerald-400 p-4 rounded-lg font-mono text-[11px] space-y-1 border border-slate-950 shadow-inner">
        <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-2">🔧 Live Pipeline Diagnostic Feed</h4>
        <pre className="whitespace-pre-wrap">{diagnosticLog}</pre>
        {rawCountsCount > 0 && masterList.length === 0 && (
          <div className="mt-2 bg-red-950/50 border border-red-800 text-red-300 p-2 rounded">
            <strong>⚠️ Structural Blockage Detected:</strong> Raw data exists ({rawCountsCount} rows), but your dashboard query is dropping them. This confirms either your Admin profile record is missing or the RLS policy is blocking your read permission.
          </div>
        )}
      </div>

      <div className="border-b pb-2 flex justify-between items-center">
        <h2 className="text-sm font-black uppercase text-gray-700 tracking-wider">📋 Master Corporate Stock Audit</h2>
        <button onClick={fetchAllStoreData} className="text-[10px] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-bold border">🔄 Refresh Feed</button>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg border text-xs">
        <div>
          <label className="block text-[9px] font-bold text-gray-400 mb-0.5">Filter Store</label>
          <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)} className="w-full border p-1 rounded bg-white font-bold text-gray-700 outline-none">
            <option value="All">All Stores</option>
            {stores.map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[9px] font-bold text-gray-400 mb-0.5">Filter Season</label>
          <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)} className="w-full border p-1 rounded bg-white font-bold text-gray-700 outline-none">
            <option value="All">All Seasons</option>
            {seasonsList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[9px] font-bold text-gray-400 mb-0.5">Filter Pallet</label>
          <input type="text" placeholder="e.g. 1" value={selectedPallet === 'All' ? '' : selectedPallet} onChange={e => setSelectedPallet(e.target.value.trim() === '' ? 'All' : e.target.value)} className="w-full border p-1 rounded bg-white font-bold text-gray-700 text-center outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 bg-blue-50/40 p-4 rounded-xl border border-blue-100 text-center">
        <div>
          <span className="block text-[10px] font-black uppercase text-gray-400">Total Counted Items</span>
          <span className="text-xl font-black text-gray-800">{totalItemsCount}</span>
        </div>
        <div>
          <span className="block text-[10px] font-black uppercase text-gray-400">Total Stock Value</span>
          <span className="text-xl font-black text-[#004aad]">£{grandTotalValue.toFixed(2)}</span>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto border rounded-lg">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100 border-b text-gray-500 uppercase text-[9px] font-black sticky top-0 bg-gray-100">
              <th className="p-2">Store</th>
              <th className="p-2">Season / Pallet</th>
              <th className="p-2">Product Description</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y font-medium text-gray-700">
            {filteredData.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center italic text-gray-400 bg-white">No multi-store metrics recorded matching criteria.</td></tr>
            ) : (
              filteredData.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/80 bg-white">
                  <td className="p-2 font-bold text-[#004aad]">{item.storeId}</td>
                  <td className="p-2 text-gray-500">{item.season_type} <span className="block text-[10px] font-bold text-gray-400">PLT #{item.pallet_number}</span></td>
                  <td className="p-2 font-semibold uppercase truncate max-w-[150px]">{item.product_name}<span className="block text-[9px] font-mono font-normal text-gray-400">{item.barcode}</span></td>
                  <td className="p-2 text-right font-bold text-gray-900">x{item.quantity}</td>
                  <td className="p-2 text-right font-black text-gray-800">£{item.totalItemValue.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}