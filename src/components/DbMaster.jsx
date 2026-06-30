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
      const text = event.target.result;
      const lines = text.split('\n');
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const columns = lines[i].split(',');
        if (columns.length >= 4) {
          rows.push({
            barcode: columns[0].trim(),
            product_code: columns[1].trim(),
            description: columns[2].trim(),
            price: columns[3].trim()
          });
        }
      }
      setCsvData(rows);
      setIsParsing(false);
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

    alert(`Database catalog successfully re-written. Packed entries: ${csvData.length}`);
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
              <input type="text" placeholder="e.g. STORE05" value={newStoreId} onChange={e => setNewStoreId(e.target.value)} className="w-full border p-2 rounded bg-white font-medium text-gray-700 outline-none uppercase" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Store Branch Name</label>
              <input type="text" placeholder="e.g. Leeds Center" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} className="w-full border p-2 rounded bg-white font-medium text-gray-700 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Allocated Email Address</label>
            <input type="email" placeholder="store05@onebeyond.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full border p-2 rounded bg-white font-medium text-gray-700 outline-none" />
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
        <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider">📊 Weekly Catalogue CSV Uploader</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white cursor-pointer relative hover:border-blue-400 transition-colors">
          <input type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isParsing} />
          <span className="text-xs font-bold text-gray-500 block">
            {isParsing ? 'Processing data lines...' : fileSelected ? '✅ File read complete' : '📂 Select Master Catalog File'}
          </span>
        </div>

        {csvData.length > 0 && (
          <button onClick={handleUpdateDatabase} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase py-2.5 rounded-lg shadow-md tracking-wider transition-colors">
            Override Database Catalog ({csvData.length} Items)
          </button>
        )}
      </div>
    </div>
  );
}