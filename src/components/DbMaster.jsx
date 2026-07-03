import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function DbMaster({ isParsing, setIsParsing, isSystemAdmin }) {
  const [fileSelected, setFileSelected] = useState(false);
  const [csvData, setCsvData] = useState([]);
  
  // New Store Account Creation State Fields
  const [newStoreId, setNewStoreId] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  if (!isSystemAdmin) {
    return <div className="text-center p-6 text-xs font-bold text-red-500">Access Denied: Unauthorised clearance level.</div>;
  }

  const handleCreateStoreAccount = async (e) => {
    e.preventDefault();
    if (isCreatingUser) return;

    if (!newStoreId || !newStoreName || !newEmail || !newPassword) {
      alert("Please fill out all store creation variables.");
      return;
    }

    setIsCreatingUser(true);

    // Initialise registration sequence packing fields into the options data parcel
    const { data, error } = await supabase.auth.signUp({
      email: newEmail.trim(),
      password: newPassword,
      options: {
        data: {
          store_id: newStoreId.trim().toUpperCase(),
          store_name: newStoreName.trim()
        }
      }
    });

    if (error) {
      alert(`Account compilation failed: ${error.message}`);
    } else if (data?.user) {
      alert(`Success! Account compiled for ${newStoreId.toUpperCase()}.\nProfile row injected automatically.`);
      setNewStoreId('');
      setNewStoreName('');
      setNewEmail('');
      setNewPassword('');
    }
    setIsCreatingUser(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileSelected(true);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        // Handle both standard line endings and Windows line endings
        const lines = text.split(/\r?\n/);
        
        if (lines.length < 2) {
          alert("File appears empty or invalid.");
          setIsParsing(false);
          return;
        }

        // Auto-detect if the Avery file is Tab-Separated (.txt) or Comma-Separated (.csv)
        const delimiter = lines[0].includes('\t') ? '\t' : ',';

        // Advanced line parser to handle descriptions that contain commas inside quotes
        const parseLine = (line) => {
          if (delimiter === '\t') return line.split('\t');
          // Regex to split by comma, but ignore commas enclosed in double quotes
          const re = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
          return line.split(re).map(val => val.replace(/^"|"$/g, '').trim());
        };

        const headers = parseLine(lines[0].toLowerCase());

        // Dynamically locate the correct columns based on common Avery/POS header names
        const findIndex = (keywords) => headers.findIndex(h => keywords.some(kw => h.includes(kw)));

        let barcodeIdx = findIndex(['barcode', 'ean', 'upc']);
        let codeIdx = findIndex(['product code', 'sku', 'item code', 'product']);
        let descIdx = findIndex(['description', 'name', 'title']);
        let priceIdx = findIndex(['price', 'retail', 'rrp', 'sell']);

        // Fallback to strict indexes if headers don't match expected terminology
        if (barcodeIdx === -1) barcodeIdx = 0;
        if (codeIdx === -1) codeIdx = 1;
        if (descIdx === -1) descIdx = 2;
        if (priceIdx === -1) priceIdx = 3;

        const rows = [];

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const columns = parseLine(lines[i]);
          
          // Ensure the row has enough data to be valid before processing
          if (columns.length > Math.max(barcodeIdx, codeIdx, descIdx, priceIdx)) {
            rows.push({
              barcode: (columns[barcodeIdx] || '').trim(),
              product_code: (columns[codeIdx] || '').trim(),
              description: (columns[descIdx] || '').trim(),
              price: (columns[priceIdx] || '').trim()
            });
          }
        }
        
        setCsvData(rows);
      } catch (error) {
        console.error("Data parsing error:", error);
        alert("An error occurred while reading the data file. Please ensure it is formatted correctly.");
      } finally {
        setIsParsing(false);
      }
    };
    
    reader.readAsText(file);
  };

  const handleUpdateDatabase = async () => {
    if (csvData.length === 0) return;
    setIsParsing(true);

    // Wipe previous catalogue configurations out safely
    await supabase.from('store_products').delete().neq('barcode', 'placeholder_bypass_key');

    // Batch upload data lines cleanly to prevent pipeline throttle constraints
    const batchSize = 200;
    for (let i = 0; i < csvData.length; i += batchSize) {
      const batch = csvData.slice(i, i + batchSize);
      await supabase.from('store_products').insert(batch);
    }

    alert(`Database catalogue successfully re-written. Packed entries: ${csvData.length}`);
    setCsvData([]);
    setFileSelected(false);
    setIsParsing(false);
  };

  return (
    <div className="space-y-6 py-2">
      {/* Sub-Panel 1: Master Store Creator Interface */}
      <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3 shadow-xs">
        <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider">➕ Register New Store Terminal</h3>
        <form onSubmit={handleCreateStoreAccount} className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Store Code ID</label>
              <input type="text" placeholder="e.g. 155" value={newStoreId} onChange={e => setNewStoreId(e.target.value)} className="w-full border p-2 rounded bg-white font-medium text-gray-700 outline-none uppercase" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Store Branch Name</label>
              <input type="text" placeholder="e.g. Coalville" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} className="w-full border p-2 rounded bg-white font-medium text-gray-700 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Allocated Email Address</label>
            <input type="email" placeholder="coalville.155@onebeyond.co.uk" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full border p-2 rounded bg-white font-medium text-gray-700 outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Terminal Password</label>
            <input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border p-2 rounded bg-white font-medium text-gray-700 outline-none" />
          </div>
          <button type="submit" disabled={isCreatingUser} className="w-full bg-[#004aad] hover:bg-blue-800 text-white font-black uppercase py-2 rounded-lg transition-colors shadow-xs">
            {isCreatingUser ? 'Compiling Access Profile...' : 'Build Store Account'}
          </button>
        </form>
      </div>

      {/* Sub-Panel 2: Weekly Catalogue File Processor */}
      <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3 shadow-xs">
        <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider">📊 Weekly Catalogue CSV/TXT Uploader</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white cursor-pointer relative hover:border-blue-400 transition-colors">
          <input type="file" accept=".csv,.txt" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isParsing} />
          <span className="text-xs font-bold text-gray-500 block">
            {isParsing ? 'Processing data lines...' : fileSelected ? '✅ File read complete' : '📂 Select Master Catalogue File'}
          </span>
        </div>

        {csvData.length > 0 && (
          <button onClick={handleUpdateDatabase} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase py-2.5 rounded-lg shadow-md tracking-wider transition-colors">
            Override Database Catalogue ({csvData.length} Items)
          </button>
        )}
      </div>
    </div>
  );
}