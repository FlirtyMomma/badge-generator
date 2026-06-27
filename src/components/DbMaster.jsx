import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function DbMaster({ isAdminAuthenticated, setIsAdminAuthenticated, isParsing, setIsParsing }) {
  const [adminPassword, setAdminPassword] = useState('');

  const handleVerifyPassword = (e) => {
    e.preventDefault();
    if (adminPassword === "ONEBEYOND2026") { 
      setIsAdminAuthenticated(true);
    } else {
      alert("Incorrect admin password.");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const productArray = [];

      lines.forEach((line, index) => {
        if (index === 0) return;
        const columns = line.split(/[,\t]/);
        if (columns.length >= 2) {
          const barcode = columns[0]?.trim();
          const name = columns[1]?.trim();
          const productCode = columns[2]?.trim() || ''; 
          const price = columns[3] ? `£${parseFloat(columns[3].trim()).toFixed(2)}` : "£0.00";

          if (barcode && name) {
            productArray.push({ barcode, description: name, product_code: productCode, price });
          }
        }
      });

      try {
        await supabase.from('store_products').delete().neq('barcode', '0');
        const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
        const batches = chunkArray(productArray, 200);

        for (const batch of batches) {
          await supabase.from('store_products').insert(batch);
        }
        alert(`Successfully uploaded ${productArray.length} products to the master live database!`);
      } catch (err) {
        console.error(err);
        alert("Upload error.");
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(file);
  };

  if (!isAdminAuthenticated) {
    return (
      <form onSubmit={handleVerifyPassword} className="space-y-3 text-center">
        <p className="text-xs text-gray-500">Enter master password credentials to override system pricing files.</p>
        <input type="password" className="w-full border p-3 rounded-lg text-center outline-none focus:border-blue-500" placeholder="Master Access Key" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
        <button type="submit" className="w-full bg-gray-800 hover:bg-black text-white py-3 rounded-lg text-sm font-bold shadow-md">Unlock System Portal</button>
      </form>
    );
  }

  return (
    <div className="p-4 border-2 border-dashed border-green-300 rounded-xl bg-gray-50 space-y-3 text-center">
      <p className="text-xs font-bold text-green-700">🔓 Master Identity Confirmed</p>
      <p className="text-[11px] text-gray-400">Select an updated `AveryProduct_Full.txt` document. All active store scanning portals will sync automatically.</p>
      <input type="file" accept=".txt,.csv" disabled={isParsing} onChange={handleFileUpload} className="text-xs block mx-auto py-2" />
      {isParsing && <p className="text-xs text-blue-600 font-bold animate-pulse">Broadcasting array nodes across store ecosystem...</p>}
    </div>
  );
}