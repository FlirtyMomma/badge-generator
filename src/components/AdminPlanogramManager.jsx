import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

const STORE_SIZES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const SEASONS = ["Mothers Day", "Fathers Day", "Easter", "Halloween", "Xmas", "Garden", "Summer"];

export default function AdminPlanogramManager() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [codePrefix, setCodePrefix] = useState('');
  const [productCode, setProductCode] = useState('');
  const [resolvedBarcode, setResolvedBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [bayNumber, setBayNumber] = useState('');
  const [season, setSeason] = useState(SEASONS[0]);
  const [selectedSizes, setSelectedSizes] = useState(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
  
  const [editingId, setEditingId] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (productCode.trim().length >= 2 && !resolvedBarcode) {
        setIsSearching(true);
        const term = (codePrefix.trim() + productCode.trim());
        const { data } = await supabase
          .from('store_products')
          .select('barcode, product_code, description')
          .or(`product_code.ilike.%${term}%,barcode.ilike.%${term}%`)
          .limit(15);
        setSuggestions(data || []);
        setShowSuggestions(true);
        setIsSearching(false);
      } else {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [productCode, resolvedBarcode, codePrefix]);

  const fetchItems = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('planogram_items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error(`Error loading planograms: ${error.message}`);
    } else {
      setItems(data || []);
    }
    setIsLoading(false);
  };

  const handleSelectSuggestion = (suggestion) => {
    const fullCode = suggestion.product_code || suggestion.barcode;
    const prefix = codePrefix.trim();
    let displayCode = fullCode;
    if (prefix && fullCode.startsWith(prefix)) {
      displayCode = fullCode.substring(prefix.length);
    }
    setProductCode(displayCode);
    setResolvedBarcode(suggestion.barcode);
    setProductName(suggestion.description || '');
    setShowSuggestions(false);
  };

  const handleSizeToggle = (size) => {
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter(s => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size]);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    
    const pCode = item.product_code || '';
    const prefix = codePrefix.trim();
    
    if (prefix && pCode.startsWith(prefix)) {
      setProductCode(pCode.substring(prefix.length));
    } else {
      setCodePrefix('');
      setProductCode(pCode);
    }
    
    setResolvedBarcode(item.barcode);
    setProductName(item.product_name);
    setBayNumber(item.bay_number);
    setSeason(item.season || SEASONS[0]);
    setSelectedSizes(item.store_sizes || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setProductCode('');
    setResolvedBarcode('');
    setProductName('');
    // Intentionally keeping bayNumber, season, and selectedSizes for faster consecutive entry
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productCode.trim() || !bayNumber.trim()) {
      toast.error("Product Code and Bay Number are required.");
      return;
    }
    if (!resolvedBarcode) {
      toast.error("Valid product code required. Barcode could not be resolved.");
      return;
    }
    if (selectedSizes.length === 0) {
      toast.error("Please select at least one store size.");
      return;
    }

    setIsSubmitting(true);

    const newRecord = {
      product_code: (codePrefix.trim() + productCode.trim()),
      barcode: resolvedBarcode,
      product_name: productName.trim() || 'Unknown Product',
      bay_number: bayNumber.trim().toUpperCase(),
      season: season,
      store_sizes: selectedSizes
    };

    let err;
    if (editingId) {
      const { error } = await supabase.from('planogram_items').update(newRecord).eq('id', editingId);
      err = error;
    } else {
      const { data: existing } = await supabase
        .from('planogram_items')
        .select('id')
        .eq('product_code', newRecord.product_code)
        .eq('season', newRecord.season)
        .maybeSingle();
      
      if (existing) {
        const { error } = await supabase.from('planogram_items').update(newRecord).eq('id', existing.id);
        err = error;
      } else {
        const { error } = await supabase.from('planogram_items').insert([newRecord]);
        err = error;
      }
    }

    if (err) {
      toast.error(`Failed to save: ${err.message}`);
    } else {
      toast.success(editingId ? "Assignment updated successfully!" : "Planogram item saved successfully!");
      cancelEdit();
      fetchItems();
      if (!editingId) document.getElementById("planogram-product-code")?.focus();
    }

    setIsSubmitting(false);
  };

  const confirmClearSeason = () => {
    toast((t) => (
      <div className="flex flex-col gap-3 p-1 text-center">
        <span className="text-sm font-bold text-gray-800">Clear an entire season?</span>
        <p className="text-[10px] text-gray-500">This will permanently delete all bay assignments for the selected season.</p>
        <select id="clear-season-select" className="border p-2 rounded text-xs font-bold" defaultValue={season}>
          {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex gap-2 justify-center mt-2">
          <button 
            onClick={() => toast.dismiss(t.id)} 
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold uppercase"
          >
            Cancel
          </button>
          <button 
            onClick={async () => {
              const targetSeason = document.getElementById('clear-season-select').value;
              toast.dismiss(t.id);
              const { error } = await supabase.from('planogram_items').delete().eq('season', targetSeason);
              if (error) {
                toast.error(`Failed to clear season: ${error.message}`);
              } else {
                toast.success(`Cleared all ${targetSeason} assignments.`);
                fetchItems();
              }
            }} 
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase shadow-md"
          >
            Delete All
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div className="flex flex-col gap-3 p-1 text-center">
        <span className="text-sm font-bold text-gray-800">Delete this planogram assignment?</span>
        <div className="flex gap-2 justify-center mt-1">
          <button 
            onClick={() => toast.dismiss(t.id)} 
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold uppercase"
          >
            Cancel
          </button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              const { error } = await supabase.from('planogram_items').delete().eq('id', id);
              if (error) {
                toast.error(`Failed to delete: ${error.message}`);
              } else {
                toast.success("Item removed from planograms.");
                fetchItems();
              }
            }} 
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase shadow-md"
          >
            Delete
          </button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const filteredItems = items.filter(item => {
    const q = searchQuery.toLowerCase();
    return (item.product_code || '').toLowerCase().includes(q) || 
           item.barcode.includes(q) || 
           (item.product_name || '').toLowerCase().includes(q) || 
           item.bay_number.toLowerCase().includes(q) ||
           (item.season || '').toLowerCase().includes(q);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center">
        <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest">Planogram Manager</h2>
        <p className="text-xs font-bold text-gray-500 mt-1">Upload and assign seasonal stock to store bays.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 items-start">
        
        {/* ADD ITEM FORM */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-[#004aad]/20 space-y-4 sticky top-6">
          <div className="flex justify-between items-end border-b pb-2">
            <h3 className="text-sm font-black text-[#004aad] uppercase tracking-wider">
              {editingId ? "Edit Assignment" : "Assign New Item"}
            </h3>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase">
                Cancel Edit
              </button>
            )}
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Product Code (or Barcode)</label>
            <div className="flex gap-2">
              <div className="w-1/3 max-w-[100px] relative">
                <input 
                  type="text"
                  value={codePrefix}
                  onChange={e => setCodePrefix(e.target.value)}
                  className="w-full border p-2 rounded-lg bg-white text-sm font-mono focus:border-[#004aad] outline-none transition-colors text-gray-600 placeholder:text-gray-300"
                  placeholder="Prefix"
                  title="Optional prefix (e.g. 145)"
                />
                {codePrefix && (
                  <button type="button" onClick={() => setCodePrefix('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 font-bold text-xs bg-white rounded-full leading-none p-0.5">
                    ✕
                  </button>
                )}
              </div>
              <div className="relative flex-grow">
                <input 
                  id="planogram-product-code"
                  type="text" 
                  required
                  value={productCode} 
                  onChange={e => {
                    setProductCode(e.target.value);
                    setResolvedBarcode(''); 
                    setShowSuggestions(true);
                  }}
                  className="w-full border p-2 rounded-lg bg-gray-50 text-sm font-mono focus:border-[#004aad] outline-none transition-colors"
                  placeholder="Type rest of code..."
                  autoComplete="off"
                />
              
              {showSuggestions && (productCode.trim().length >= 2) && (
                <div className="absolute z-50 w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-xs font-bold text-gray-400">Searching...</div>
                  ) : (
                    suggestions.length === 0 ? (
                      <div className="p-4 text-center text-xs font-bold text-gray-400">No matches found.</div>
                    ) : (
                      suggestions.map(s => (
                        <div 
                          key={s.barcode} 
                          onClick={() => handleSelectSuggestion(s)}
                          className="p-2 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <div className="font-bold text-gray-800 text-xs truncate">{s.description || 'Unknown Product'}</div>
                          <div className="flex justify-between text-[10px] font-mono mt-0.5">
                            <span className="text-[#004aad]">Code: {s.product_code || 'N/A'}</span>
                            <span className="text-gray-400">BC: {s.barcode}</span>
                          </div>
                        </div>
                      ))
                    )
                  )}
                </div>
              )}
              </div>
            </div>
            
            {resolvedBarcode ? (
              <p className="text-[9px] font-bold text-emerald-600 mt-1 uppercase">✓ Linked to: {productName}</p>
            ) : productCode ? (
              <p className="text-[9px] font-bold text-orange-500 mt-1 uppercase">Please select an item from the list...</p>
            ) : null}
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Product Name <span className="lowercase font-normal italic">(optional)</span></label>
            <input 
              type="text" 
              value={productName} 
              onChange={e => setProductName(e.target.value)}
              className="w-full border p-2 rounded-lg bg-gray-50 text-sm focus:border-[#004aad] outline-none transition-colors"
              placeholder="e.g. Easter Bunny Ears"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Target Bay Number</label>
            <input 
              type="text" 
              required
              value={bayNumber} 
              onChange={e => setBayNumber(e.target.value)}
              className="w-full border p-2 rounded-lg bg-gray-50 text-sm font-bold uppercase focus:border-[#004aad] outline-none transition-colors"
              placeholder="e.g. BAY-04"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Target Season</label>
            <select 
              value={season} 
              onChange={e => setSeason(e.target.value)}
              className="w-full border p-2 rounded-lg bg-gray-50 text-sm font-bold focus:border-[#004aad] outline-none transition-colors"
            >
              {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="pt-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2">Applicable Store Sizes</label>
            <div className="grid grid-cols-3 gap-2">
              {STORE_SIZES.map(size => (
                <label key={size} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${selectedSizes.includes(size) ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-gray-50 border-gray-200 text-gray-500 grayscale hover:grayscale-0'}`}>
                  <input 
                    type="checkbox" 
                    checked={selectedSizes.includes(size)} 
                    onChange={() => handleSizeToggle(size)}
                    className="hidden" 
                  />
                  <div className={`w-3 h-3 rounded border flex items-center justify-center ${selectedSizes.includes(size) ? 'bg-[#004aad] border-[#004aad]' : 'border-gray-300'}`}>
                    {selectedSizes.includes(size) && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="text-[10px] font-bold uppercase">Tier {size}</span>
                </label>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting || !resolvedBarcode}
            className={`w-full font-black uppercase py-3 rounded-lg shadow-md transition-all mt-4 tracking-wider text-xs ${
              isSubmitting || !resolvedBarcode ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 
              editingId ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-[#004aad] hover:bg-blue-800 text-white'
            }`}
          >
            {isSubmitting ? 'Saving...' : (editingId ? 'Update Assignment' : 'Save Assignment')}
          </button>
        </form>

        {/* ACTIVE ASSIGNMENTS */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden flex flex-col h-full">
          
          {/* List Header & Controls */}
          <div className="p-4 bg-gray-50 border-b border-gray-200 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">Active Assignments</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase">{items.length} items mapped</p>
              </div>
              <button 
                onClick={confirmClearSeason}
                className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1"
              >
                <span>🗑️ Clear Season</span>
              </button>
            </div>
            
            <input 
              type="text" 
              placeholder="Search by code, product, bay..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border p-2 rounded-lg text-xs font-medium outline-none focus:border-[#004aad]"
            />
          </div>

          {/* List Data */}
          <div className="overflow-x-auto flex-grow max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500 font-bold text-xs uppercase animate-pulse">Loading assignments...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-bold text-xs uppercase">No assignments found.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 uppercase font-black text-[9px] tracking-wider border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Code</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Bay</th>
                    <th className="p-3">Season</th>
                    <th className="p-3">Store Sizes</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.map(item => (
                    <tr key={item.id} className={`transition-colors ${editingId === item.id ? 'bg-amber-50' : 'hover:bg-blue-50/30'}`}>
                      <td className="p-3">
                        <div className="font-bold text-gray-800">{item.product_code || 'N/A'}</div>
                        <div className="font-mono text-[9px] text-gray-400">{item.barcode}</div>
                      </td>
                      <td className="p-3 font-bold text-gray-800">{item.product_name}</td>
                      <td className="p-3">
                        <span className="bg-[#004aad] text-white px-2 py-0.5 rounded font-black tracking-widest text-[10px]">{item.bay_number}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-gray-600 font-bold text-[10px] uppercase">{item.season || 'N/A'}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {item.store_sizes.map(size => (
                            <span key={size} className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase">{size}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="text-[10px] font-black uppercase text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
