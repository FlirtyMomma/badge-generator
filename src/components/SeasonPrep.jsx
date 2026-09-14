import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';


const STORE_SIZES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

export default function SeasonPrep({ session, storeSize, seasons = [] }) {
  const [season, setSeason] = useState(() => localStorage.getItem('onebeyond_bayfinder_season') || (seasons[0] || 'Xmas'));
  
  const [isLoading, setIsLoading] = useState(false);
  const [planogramItems, setPlanogramItems] = useState([]);
  const [legacyQuantities, setLegacyQuantities] = useState({}); // { product_code: total_quantity }
  
  const [filter, setFilter] = useState('all'); // 'all', 'missing', 'have'

  useEffect(() => {
    if (seasons.length > 0 && !seasons.includes(season)) {
      setSeason(seasons[0]);
    }
  }, [seasons, season]);

  useEffect(() => {
    localStorage.setItem('onebeyond_bayfinder_season', season);
    fetchData();
  }, [storeSize, season, session]);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);

    try {
      // 1. Fetch Planogram Items for the selected season and store size
      const { data: pItems, error: pError } = await supabase
        .from('planogram_items')
        .select('*')
        .eq('season', season)
        .contains('store_sizes', [storeSize]);

      if (pError) throw pError;
      setPlanogramItems(pItems || []);

      // 2. Fetch Legacy Stock for the selected season
      const { data: legacyData, error: lError } = await supabase
        .from('legacy_stock_counts')
        .select('barcode, quantity')
        .eq('user_id', session.user.id)
        .eq('season_type', season);

      if (lError) throw lError;

      // 3. Resolve barcodes to product_codes
      const legacyMap = {};
      if (legacyData && legacyData.length > 0) {
        const barcodes = [...new Set(legacyData.map(l => l.barcode))];
        
        // Fetch product codes for these barcodes
        const { data: products, error: prodError } = await supabase
          .from('store_products')
          .select('barcode, product_code')
          .in('barcode', barcodes);
          
        if (prodError) throw prodError;

        // Build mapping: barcode -> product_code
        const barcodeToCode = {};
        products?.forEach(p => {
          barcodeToCode[p.barcode] = p.product_code;
        });

        // Aggregate quantities by product_code
        legacyData.forEach(item => {
          // If we can't find a parent product_code, fallback to the barcode itself
          const pCode = barcodeToCode[item.barcode] || item.barcode;
          if (!legacyMap[pCode]) legacyMap[pCode] = 0;
          legacyMap[pCode] += (item.quantity || 0);
        });
      }

      setLegacyQuantities(legacyMap);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load season prep data");
    } finally {
      setIsLoading(false);
    }
  };

  // Combine and process the data
  const combinedData = planogramItems.map(item => {
    const qty = legacyQuantities[item.product_code] || 0;
    return { ...item, legacyQuantity: qty };
  });

  const filteredData = combinedData.filter(item => {
    if (filter === 'missing') return item.legacyQuantity === 0;
    if (filter === 'have') return item.legacyQuantity > 0;
    return true;
  });

  const missingCount = combinedData.filter(i => i.legacyQuantity === 0).length;
  const haveCount = combinedData.filter(i => i.legacyQuantity > 0).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header & Controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h1 className="text-xl font-black text-gray-800 uppercase tracking-widest mb-4">Season Order Prep</h1>
        <p className="text-sm text-gray-500 mb-6 font-medium">
          Compare your saved Legacy Stock against the required Planogram items for the upcoming season. 
          See exactly what you already have and what you need to order.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Season</label>
            <select 
              value={season} 
              onChange={e => setSeason(e.target.value)}
              className="w-full border p-3 rounded-lg font-bold text-gray-700 outline-none focus:border-[#004aad] bg-gray-50"
            >
              {seasons.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Store Size</label>
            <div className="w-full border p-3 rounded-lg font-bold text-gray-400 bg-gray-100 uppercase tracking-widest text-sm flex items-center justify-between">
              <span>Tier {storeSize}</span>
              <span className="text-[9px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Admin Locked</span>
            </div>
          </div>
          <div className="flex items-end">
            <button 
              onClick={fetchData}
              className="bg-[#004aad] hover:bg-blue-800 text-white px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-colors w-full sm:w-auto h-[46px]"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Planogram Lines</p>
          <p className="text-3xl font-black text-gray-800">{combinedData.length}</p>
        </div>
        <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 shadow-sm text-center">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Lines in Legacy</p>
          <p className="text-3xl font-black text-emerald-700">{haveCount}</p>
        </div>
        <div className="bg-red-50 p-5 rounded-xl border border-red-200 shadow-sm text-center">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Missing / To Order</p>
          <p className="text-3xl font-black text-red-700">{missingCount}</p>
        </div>
      </div>

      {/* Data Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button 
            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${filter === 'all' ? 'bg-[#004aad] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setFilter('all')}
          >
            All Items
          </button>
          <button 
            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${filter === 'missing' ? 'bg-red-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setFilter('missing')}
          >
            Need to Order
          </button>
          <button 
            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-colors ${filter === 'have' ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
            onClick={() => setFilter('have')}
          >
            Have Stock
          </button>
        </div>

        <div className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-gray-400 font-bold animate-pulse">Analyzing Legacy Stock...</div>
          ) : filteredData.length === 0 ? (
            <div className="p-12 text-center text-gray-400 font-bold">No items found for this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Product Code</th>
                    <th className="p-3 text-[10px] font-black uppercase text-gray-400 tracking-wider">Product Name</th>
                    <th className="p-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Bay</th>
                    <th className="p-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Legacy Qty</th>
                    <th className="p-3 text-[10px] font-black uppercase text-gray-400 tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map(item => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <div className="font-mono text-xs font-bold text-[#004aad]">{item.product_code}</div>
                        <div className="font-mono text-[9px] text-gray-400 mt-0.5">BC: {item.barcode}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-xs font-bold text-gray-800 line-clamp-2">{item.product_name}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs font-black uppercase shadow-sm">
                          {item.bay_number}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {item.legacyQuantity > 0 ? (
                          <span className="text-lg font-black text-emerald-600">{item.legacyQuantity}</span>
                        ) : (
                          <span className="text-lg font-black text-gray-300">0</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {item.legacyQuantity > 0 ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-1 rounded-full whitespace-nowrap">✓ Have Stock</span>
                        ) : (
                          <span className="bg-red-100 text-red-800 text-[9px] font-black uppercase px-2 py-1 rounded-full whitespace-nowrap">! Order</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
