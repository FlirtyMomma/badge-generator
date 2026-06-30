import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminLegacyDashboard() {
  const [masterList, setMasterList] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('All');
  const [selectedSeason, setSelectedSeason] = useState('All');
  const [selectedPallet, setSelectedPallet] = useState('All');
  const [loading, setLoading] = useState(true);
  const [diagnosticLog, setDiagnosticLog] = useState('');

  const seasonsList = ["Mothers Day", "Fathers Day", "Easter", "Halloween", "Xmas", "Garden", "Summer"];

  useEffect(() => {
    fetchAllStoreData();
  }, []);

  const fetchAllStoreData = async () => {
    setLoading(true);
    let logStr = "--- System Diagnostics ---\n";

    // Step 1: Fetch raw stock logs safely with zero complex joins
    const { data: countsData, error: countsError } = await supabase
      .from('legacy_stock_counts')
      .select('id, created_at, pallet_number, barcode, product_name, quantity, season_type, user_id')
      .order('created_at', { ascending: false });

    if (countsError) {
      logStr += `❌ Counts Fetch Failed: ${countsError.message}\n`;
      setDiagnosticLog(logStr);
      setLoading(false);
      return;
    }

    logStr += `✅ Step 1: Found ${countsData?.length || 0} raw rows in database.\n`;

    if (countsData && countsData.length > 0) {
      // Step 2: Fetch all profiles to map user IDs manually in browser memory
      const { data: profilesData } = await supabase.from('store_profiles').select('id, store_id, store_name');
      const profileMap = {};
      if (profilesData) {
        profilesData.forEach(p => { profileMap[p.id] = p; });
      }

      // Step 3: Fetch item pricing details mapping
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

      // Step 4: Statically combine datasets
      const formatted = countsData.map(item => {
        const livePriceString = priceMap[item.barcode] || "£0.00";
        const parsedPrice = parseFloat(livePriceString.replace(/[^0-9.]/g, '')) || 0;
        
        const matchingProfile = profileMap[item.user_id];
        const displayStoreId = matchingProfile?.store_id || 'ADMIN';
        const displayStoreName = matchingProfile?.store_name || 'Corporate Headquarters';

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
      logStr += `✅ Step 2: Decoupled client memory render processed successfully.\n`;
    } else {
      setMasterList([]);
      setStores([]);
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
      <div className="bg-slate-900 text-emerald-400 p-4 rounded-lg font-mono text-[11px] space-y-1 border border-slate-950 shadow-inner">
        <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-1">🔧 Decoupled Pipeline Feed</h4>
        <pre className="whitespace-pre-wrap">{diagnosticLog}</pre>
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
            <tr className="bg-gray-100 border-b text-gray-500 uppercase text-[9px] font-black sticky top-0">
              <th className="p-2">Store</th>
              <th className="p-2">Season / Pallet</th>
              <th className="p-2">Product Description</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y font-medium text-gray-700">
            {filteredData.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center italic text-gray-400 bg-white">No entries matching criteria.</td></tr>
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