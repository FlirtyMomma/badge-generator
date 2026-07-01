import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function StoreStockTakeList({ session }) {
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStoreInventory();
  }, [session]);

  const fetchStoreInventory = async () => {
    if (!session?.user?.id) return;
    setLoading(true);

    const { data: counts, error: countsError } = await supabase
      .from('legacy_stock_counts')
      .select('barcode, product_name, quantity')
      .eq('user_id', session.user.id);

    if (countsError) {
      console.error("Stock take inventory error:", countsError.message);
      setLoading(false);
      return;
    }

    if (counts && counts.length > 0) {
      const aggregationMap = {};
      counts.forEach(item => {
        if (!aggregationMap[item.barcode]) {
          aggregationMap[item.barcode] = {
            barcode: item.barcode,
            product_name: item.product_name,
            total_quantity: 0
          };
        }
        aggregationMap[item.barcode].total_quantity += item.quantity;
      });

      const aggregatedList = Object.values(aggregationMap);
      const uniqueBarcodes = aggregatedList.map(item => item.barcode);
      let priceMap = {};
      
      const { data: products } = await supabase
        .from('store_products')
        .select('barcode, price')
        .in('barcode', uniqueBarcodes);

      if (products) {
        products.forEach(p => { priceMap[p.barcode] = p.price; });
      }

      const compiledInventory = aggregatedList.map(item => {
        const priceStr = priceMap[item.barcode] || "£0.00";
        const parsedPrice = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
        return {
          ...item,
          priceString: priceStr,
          totalValue: parsedPrice * item.total_quantity
        };
      }).sort((a, b) => a.product_name.localeCompare(b.product_name));

      setInventory(compiledInventory);
    } else {
      setInventory([]);
    }
    setLoading(false);
  };

  const renderPrecisionBarcode = (codeString) => {
    const cleanString = codeString.trim().replace(/[^0-9A-Za-z\-]/g, '') || "000000";
    
    let lines = [];
    lines.push(1, 0, 1);

    for (let i = 0; i < cleanString.length; i++) {
      const num = cleanString.charCodeAt(i);
      if (num % 2 === 0) {
        lines.push(1, 1, 0, 0, 1, 0, 1, 1);
      } else {
        lines.push(1, 0, 1, 1, 0, 0, 1, 1);
      }
    }

    lines.push(1, 0, 1, 1, 1);

    return (
      <div className="flex flex-col items-center justify-center p-1 bg-white rounded border border-gray-100 shadow-2xs">
        <svg 
          className="h-14 w-48 min-w-[180px]" 
          viewBox={`0 0 ${lines.length} 10`} 
          preserveAspectRatio="none"
          shapeRendering="crispEdges" 
        >
          {lines.map((bit, index) => bit === 1 && (
            <rect 
              key={index} 
              x={index} 
              y={0} 
              width={1} 
              height={10} 
              fill="#000000" 
            />
          ))}
        </svg>
        <span className="text-[10px] font-mono font-black tracking-widest text-gray-500 mt-1">{cleanString}</span>
      </div>
    );
  };

  const filteredInventory = inventory.filter(item => {
    const query = searchQuery.trim().toLowerCase();
    return !query || item.product_name.toLowerCase().includes(query) || item.barcode.includes(query);
  });

  const grandTotalValue = filteredInventory.reduce((acc, item) => acc + item.totalValue, 0);

  if (loading) return <div className="text-center p-6 text-xs font-bold text-gray-400">Compiling store stock sheets...</div>;

  return (
    <div className="space-y-4 py-1">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider">📋 Complete Inventory Sheet</h3>
        <button onClick={fetchStoreInventory} className="text-[9px] bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded font-bold border">🔄 Refresh</button>
      </div>

      <div>
        <input 
          type="text" 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by product description or barcode..." 
          className="w-full border p-2 rounded-lg text-xs font-medium text-gray-800 bg-gray-50 outline-none focus:border-blue-500 shadow-inner"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-gray-50 border p-2 rounded-lg">
          <span className="block text-[9px] font-bold text-gray-400 uppercase">Distinct SKUs</span>
          <span className="text-sm font-black text-gray-800">{filteredInventory.length}</span>
        </div>
        <div className="bg-blue-50/60 border border-blue-100 p-2 rounded-lg">
          <span className="block text-[9px] font-bold text-blue-400 uppercase">Stock Valuation</span>
          <span className="text-sm font-black text-[#004aad]">£{grandTotalValue.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {filteredInventory.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-8 italic bg-white rounded-lg border border-dashed">No items found matching criteria.</p>
        ) : (
          filteredInventory.map(item => (
            <div key={item.barcode} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-white transition-colors shadow-2xs">
              
              <div className="min-w-0 flex-1 space-y-1">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{item.product_name}</h4>
                <div className="text-xs font-medium text-gray-400">
                  <span>Price: <strong className="text-gray-600">{item.priceString}</strong> each</span>
                  <span className="mx-2">•</span>
                  <span>Value: <strong className="text-gray-700">£{item.totalValue.toFixed(2)}</strong></span>
                </div>
                <div className="inline-block bg-gray-900 text-white text-xs font-black px-3 py-1 rounded-md mt-1">
                  Total Counted: {item.total_quantity}
                </div>
              </div>
              
              <div className="flex-shrink-0 self-center lg:self-auto">
                {renderPrecisionBarcode(item.barcode)}
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}