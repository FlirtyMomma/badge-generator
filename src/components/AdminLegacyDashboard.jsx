import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminLegacyDashboard() {
  const [masterList, setMasterList] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('All');
  const [selectedSeason, setSelectedSeason] = useState('All');
  const [selectedPallet, setSelectedPallet] = useState('All');
  const [loading, setLoading] = useState(true);

  const seasonsList = ["Mothers Day", "Fathers Day", "Easter", "Halloween", "Xmas", "Garden", "Summer"];

  useEffect(() => {
    fetchAllStoreData();
  }, []);

  const fetchAllStoreData = async () => {
    setLoading(true);
    // Fetch counts and perform a left-join on both store products and store profiles
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
        store_profiles ( store_id, store_name ),
        store_products ( price )
      `)
      .order('created_at', { ascending: false });

    if (data) {
      const formatted = data.map(item => {
        const livePriceString = item.store_products?.price || "£0.00";
        const parsedPrice = parseFloat(livePriceString.replace(/[^0-9.]/g, '')) || 0;
        return {
          ...item,
          storeId: item.store_profiles?.store_id || 'UNKNOWN',
          storeName: item.store_profiles?.store_name || 'Unknown Store',
          livePriceString,
          parsedPrice,
          totalItemValue: parsedPrice * item.quantity
        };
      });
      setMasterList(formatted);

      // Extract unique stores list for the filter dropdown
      const uniqueStores = [...new Set(formatted.map(item => item.storeId))].sort();
      setStores(uniqueStores);
    }
    setLoading(false);
  };

  // --- FILTER MATRIX ---
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
      <div className="border-b pb-2 flex justify-between items-center">
        <h2 className="text-sm font-black uppercase text-gray-700 tracking-wider">📋 Master Corporate Stock Audit</h2>
        <button onClick={fetchAllStoreData} className="text-[10px] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-bold border">🔄 Refresh Feed</button>
      </div>

      {/* Admin Filters Grid */}
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

      {/* Financial Overview Metrics */}
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

      {/* Master Data Log Table View */}
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