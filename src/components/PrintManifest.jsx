import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function PrintManifest({ session, viewSeason, viewPallet }) {
  const [items, setItems] = useState([]);
  const [palletValue, setPalletValue] = useState(0);

  // Pull fresh ledger realities independently to ensure print clarity
  useEffect(() => {
    if (!session?.user?.id || viewPallet === 'All') return;

    const fetchPrintData = async () => {
      const { data: countsData } = await supabase
        .from('legacy_stock_counts')
        .select('barcode, product_name, quantity')
        .eq('user_id', session.user.id)
        .eq('season_type', viewSeason)
        .eq('pallet_number', viewPallet);

      if (!countsData || countsData.length === 0) {
        setItems([]);
        setPalletValue(0);
        return;
      }

      const uniqueBarcodes = [...new Set(countsData.map(item => item.barcode))];
      let priceMap = {};

      const { data: productsData } = await supabase
        .from('store_products')
        .select('barcode, price')
        .in('barcode', uniqueBarcodes);

      if (productsData) {
        productsData.forEach(p => { priceMap[p.barcode] = p.price; });
      }

      let total = 0;
      const formatted = countsData.map(item => {
        const priceStr = priceMap[item.barcode] || "£0.00";
        const parsedPrice = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
        total += (parsedPrice * item.quantity);
        return { ...item };
      });

      setItems(formatted);
      setPalletValue(total);
    };

    fetchPrintData();
  }, [session, viewSeason, viewPallet]);

  if (viewPallet === 'All' || items.length === 0) return null;

  return (
    <div className="hidden print:block fixed inset-0 bg-white text-black p-10 font-sans z-[999999] w-screen h-screen">
      <div className="border-4 border-black p-6 space-y-4 rounded-lg bg-white">
        
        <div className="border-b-4 border-black pb-4 text-center">
          <h1 className="text-3xl font-black uppercase tracking-tight">ONEBEYOND AUDIT MANIFEST</h1>
          <div className="grid grid-cols-2 text-sm font-bold mt-2 uppercase tracking-wide">
            <div>Store Node: <span className="underline">{session?.user?.email?.split('@')[0].toUpperCase()}</span></div>
            <div className="text-right">Generated: <span className="underline">{new Date().toLocaleDateString('en-GB')}</span></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-b-4 border-black pb-4 text-center items-center">
          <div className="border-r-2 border-black py-2">
            <span className="block text-xs font-black uppercase text-gray-400">AUDIT TARGET ZONE</span>
            <span className="text-xl font-black uppercase">{viewSeason}</span>
          </div>
          <div className="py-2">
            <span className="block text-xs font-black uppercase text-gray-400">CONTAINER LOG ELEMENT</span>
            <span className="text-3xl font-black">PALLET #{viewPallet}</span>
          </div>
        </div>

        <table className="w-full text-left text-xs border-collapse mt-4">
          <thead>
            <tr className="border-b-2 border-black font-black uppercase text-[10px]">
              <th className="py-1">Barcode Index</th>
              <th className="py-1">Product SKU Description</th>
              <th className="py-1 text-right">Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y border-b border-black font-medium">
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-black/10">
                <td className="font-mono font-bold py-2">{item.barcode}</td>
                <td className="uppercase font-semibold py-2">{item.product_name}</td>
                <td className="text-right font-black text-sm py-2">x{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-center pt-4 text-sm font-black uppercase border-t-2 border-black">
          <span>Total Units Counted: {items.reduce((acc, item) => acc + item.quantity, 0)}</span>
          <span className="text-base">Est Valuation: £{palletValue.toFixed(2)}</span>
        </div>

      </div>
    </div>
  );
}