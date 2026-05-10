import { useState, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import Badge from './components/Badge';
import { Analytics } from "@vercel/analytics/react"

function App() {
  // Initialize state from localStorage if it exists
  const [staff, setStaff] = useState(() => {
    const saved = localStorage.getItem('onebeyond_staff_list');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [form, setForm] = useState({ name: '', position: '', code: '' });
  const [editingId, setEditingId] = useState(null);
  const contentRef = useRef(null);

  // Persistence: Save to localStorage whenever the staff list changes
  useEffect(() => {
    localStorage.setItem('onebeyond_staff_list', JSON.stringify(staff));
  }, [staff]);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: "OneBeyond_Staff_Badges",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.code) return;

    if (editingId) {
      setStaff(staff.map(s => s.id === editingId ? { ...form, id: editingId } : s));
      setEditingId(null);
    } else {
      setStaff([...staff, { ...form, id: Date.now() }]);
    }
    setForm({ name: '', position: '', code: '' });
  };

  const startEdit = (person) => {
    setEditingId(person.id);
    setForm({ name: person.name, position: person.position, code: person.code });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearAll = () => {
    if (window.confirm("This will delete ALL staff from the current list. Are you sure?")) {
      setStaff([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-lg mb-10 border border-gray-200 no-print">
        <h1 className="text-2xl font-bold mb-4 text-gray-800 text-center uppercase tracking-tight">
          <span className="text-[#004aad]">One</span>Beyond Badge Tool
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none" 
            placeholder="Staff Name" 
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
          />
          <input 
            className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none" 
            placeholder="Position" 
            value={form.position}
            onChange={e => setForm({...form, position: e.target.value})}
          />
          <input 
            className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none font-mono" 
            placeholder="Till Code" 
            value={form.code}
            onChange={e => setForm({...form, code: e.target.value})}
          />
          
          <div className="flex gap-2">
            <button type="submit" className={`flex-grow py-3 rounded-lg font-bold text-white shadow-md transition-all active:scale-95 ${editingId ? 'bg-orange-500' : 'bg-[#004aad]'}`}>
              {editingId ? 'Update Badge' : 'Add Staff'}
            </button>
            {editingId && (
              <button type="button" onClick={() => {setEditingId(null); setForm({name:'', position:'', code:''})}} className="px-4 py-3 bg-gray-200 rounded-lg text-gray-600 font-bold">Cancel</button>
            )}
          </div>
        </form>
        
        {staff.length > 0 && (
          <div className="flex flex-col gap-2 mt-6">
            <button 
              onClick={() => handlePrint()} 
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg font-black uppercase tracking-widest shadow-lg transition-all active:scale-95"
            >
              🖨️ Print {staff.length} Badges
            </button>
            <button 
              onClick={clearAll}
              className="w-full text-red-500 text-sm font-bold py-2 hover:underline"
            >
              Clear Current List
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-start md:justify-center overflow-x-auto pb-20 px-4">
        <div 
          ref={contentRef} 
          className="bg-white shadow-2xl p-[10mm] w-[210mm] min-w-[210mm] min-h-[297mm] grid grid-cols-2 gap-x-4 gap-y-6 content-start"
        >
          {staff.map((person) => (
            <div key={person.id} className="relative group flex justify-center w-[85mm] h-[55mm]">
              <Badge {...person} />
              <div className="absolute -top-3 -right-2 flex gap-2 no-print">
                 <button onClick={() => startEdit(person)} className="bg-orange-500 hover:bg-orange-600 text-white w-8 h-8 rounded-full shadow-md flex items-center justify-center font-bold">✎</button>
                 <button onClick={() => setStaff(staff.filter(s => s.id !== person.id))} className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded-full shadow-md flex items-center justify-center font-bold">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;