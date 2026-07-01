import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminLegacyDashboard() {
  const [grandTotalValue, setGrandTotalValue] = useState(0);
  const [totalItemsCount, setTotalItemsCount] = useState(0);
  const [stores, setStores] = useState([]);

  const [masterList, setMasterList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 25; 

  const [selectedStore, setSelectedStore] = useState('All');
  const [selectedSeason, setSelectedSeason] = useState('All');
  const [selectedPallet, setSelectedPallet] = useState('All');
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);

  const seasonsList = ["Mothers Day", "Fathers Day", "Easter", "Halloween", "Xmas", "Garden", "Summer"];

  useEffect(() => {
    fetchGlobalMetrics();
    fetchPaginatedRows(1, true);
  }, [selectedStore, selectedSeason, selectedPallet]);

  const fetchGlobalMetrics = async () => {
    setLoadingMetrics(true);
    try {
      let query = supabase.from('legacy_stock_counts').select('quantity, barcode, user_id');
      
      if (selectedSeason !== 'All') query = query.eq('season_type', selectedSeason);
      if (selectedPallet !== 'All') query = query.eq('pallet_number', selectedPallet);

      if (selectedStore !== 'All') {
        const { data: profs } = await supabase.from('store_profiles').select('id').eq('store_id', selectedStore);
        const targetIds = profs?.map(p => p.id) || [];
        query = query.in('user_id', targetIds);
      }

      const { data: counts, error } = await query;
      if (error || !counts || counts.length === 0) {
        setTotalItemsCount(0);
        setGrandTotalValue(0);
        return;
      }

      const totalQty = counts.reduce((acc, item) => acc + item.quantity, 0);
      setTotalItemsCount(totalQty);

      const uniqueBarcodes = [...new Set(counts.map(item => item.barcode))];
      let priceMap = {};
      if (uniqueBarcodes.length > 0) {
        const { data: prices } = await supabase.from('store_products').select('barcode, price').in('barcode', uniqueBarcodes);
        if (prices) {
          prices.forEach(p => { priceMap[p.barcode] = p.price; });
        }
      }

      const totalVal = counts.reduce((acc, item) => {
        const priceStr = priceMap[item.barcode] || "£0.00";
        const parsedPrice = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
        return acc + (parsedPrice * item.quantity);
      }, 0);

      setGrandTotalValue(totalVal);

      const { data: profiles } = await supabase.from('store_profiles').select('store_id');
      if (profiles) {
        const uniqueStores = [...new Set(profiles.map(p => p.store_id))].filter(Boolean).sort();
        setStores(uniqueStores);
      }
    } catch (err) {
      console.error("Metrics aggregation failure:", err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchPaginatedRows = async (page, resetList = false) => {
    if (loadingRows) return;
    setLoadingRows(true);

    try {
      const fromRange = (page - 1) * ITEMS_PER_PAGE;
      const toRange = fromRange + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('legacy_stock_counts')
        .select('id, created_at, pallet_number, barcode, product_name, quantity, season_type, user_id')
        .order('created_at', { ascending: false })
        .range(fromRange, toRange); 

      if (selectedSeason !== 'All') query = query.eq('season_type', selectedSeason);
      if (selectedPallet !== 'All') query = query.eq('pallet_number', selectedPallet);

      if (selectedStore !== 'All') {
        const { data: profs } = await supabase.from('store_profiles').select('id').eq('store_id', selectedStore);
        const targetIds = profs?.map(p => p.id) || [];
        query = query.in('user_id', targetIds);
      }

      const { data: countsData, error } = await query;

      if (error || !countsData) {
        if (resetList) setMasterList([]);
        setHasMore(false);
        return;
      }

      setHasMore(countsData.length === ITEMS_PER_PAGE);

      const { data: profilesData } = await supabase.from('store_profiles').select('id, store_id, store_name');
      const profileMap = {};
      if (profilesData) profilesData.forEach(p => { profileMap[p.id] = p; });

      const uniqueBarcodes = [...new Set(countsData.map(item => item.barcode))];
      let priceMap = {};
      if (uniqueBarcodes.length > 0) {
        const { data: productsData } = await supabase.from('store_products').select('barcode, price').in('barcode', uniqueBarcodes);
        if (productsData) productsData.forEach(p => { priceMap[p.barcode] = p.price; });
      }

      const formatted = countsData.map(item => {
        const livePriceString = priceMap[item.barcode] || "£0.00";
        const parsedPrice = parseFloat(livePriceString.replace(/[^0-9.]/g, '')) || 0;
        const prof = profileMap[item.user_id];

        return {
          ...item,
          storeId: prof?.store_id || 'ADMIN',
          storeName: prof?.store_name || 'Corporate HQ',
          livePriceString,
          parsedPrice,
          totalItemValue: parsedPrice * item.quantity
        };
      });

      if (resetList) {
        setMasterList(formatted);
        setCurrentPage(1);
      } else {
        setMasterList(prev => [...prev, ...formatted]);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error("Pagination processor error:", err);
    } finally {
      setLoadingRows(false);
    }
  };

  const downloadMasterCSV = () => {
    if (masterList.length === 0) {
      alert("No matching data rows available inside the active filter scope to extract.");
      return;
    }

    const headers = ["Store ID", "Store Name", "Season", "Pallet Number", "Barcode", "Product Name", "Quantity", "Unit Price", "Total Value", "Logged Timestamp"];
    const rows = masterList.map(item => [
      `"${item.storeId}"`,
      `"${item.storeName}"`,
      `"${item.season_type}"`,
      `"${item.pallet_number}"`,
      `"${item.barcode}"`,
      `"${item.product_name.replace(/"/g, '""')}"`, 
      item.quantity,
      `"${item.livePriceString}"`,
      item.totalItemValue.toFixed(2),
      `"${new Date(item.created_at).toLocaleString('en-GB')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const fileTimestamp = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `OneBeyond_Master_Audit_${selectedSeason}_${fileTimestamp}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadMoreClick = () => {
    fetchPaginatedRows(currentPage + 1, false);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 space-y-4 no-print">
      <div className="border-b pb-2 flex justify-between items-center">
        <h2 className="text-sm font-black uppercase text-gray-700 tracking-wider">📋 Scalable Enterprise Stock Audit</h2>
        <div className="flex gap-2">
          <button 
            onClick={downloadMasterCSV} 
            className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded font-bold border border-emerald-200 shadow-2xs transition-colors"
          >
            📥 Export CSV Spreadsheet
          </button>
          <button 
            onClick={() => { fetchGlobalMetrics(); fetchPaginatedRows(1, true); }} 
            className="text-[10px] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded font-bold border"
          >
            🔄 Force Sync
          </button>
        </div>
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

      <div className="grid grid-cols-2 gap-4 bg-blue-50/40 p-4 rounded-xl border border-blue-100 text-center relative">
        {loadingMetrics && <div className="absolute inset-0 bg-white/60 flex items-center justify-center text-[10px] font-bold text-blue-600 rounded-xl">Calculating macro values...</div>}
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
            <tr className="bg-gray-100 border-b text-gray-500 uppercase text-[9px] font-black sticky top-0 bg-gray-100 z-10">
              <th className="p-2">Store</th>
              <th className="p-2">Season / Pallet</th>
              <th className="p-2">Product Description</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y font-medium text-gray-700">
            {masterList.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center italic text-gray-400 bg-white">No stock entries found matching conditions.</td></tr>
            ) : (
              masterList.map(item => (
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

      {hasMore && (
        <button 
          onClick={handleLoadMoreClick} 
          disabled={loadingRows}
          className="w-full text-center text-xs font-black uppercase text-gray-500 bg-gray-50 hover:bg-gray-100 py-2 border rounded-lg transition-colors shadow-2xs"
        >
          {loadingRows ? 'Loading next segment...' : '⬇ Load Next 25 Items'}
        </button>
      )}
    </div>
  );
}