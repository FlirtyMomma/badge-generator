import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import Badge from './components/Badge';

function App() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: '', position: '', code: '' });
  const [editingId, setEditingId] = useState(null);
  
  const contentRef = useRef(null);

  // The official way to trigger print in the latest react-to-print version
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: "Staff_Badges_Sheet",
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
    if (window.confirm("Are you sure you want to clear the entire sheet?")) {
      setStaff([]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      {/* Control Panel */}
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-lg mb-10 border border-gray-200 no-print">
        <h1 className="text-2xl font-bold mb-4 text-gray-800 text-center">
          {editingId ? '📝 Edit Badge' : '🏷️ Badge Creator'}
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
            <button type="submit" className={`flex-grow py-3 rounded-lg font-bold text-white ${editingId ? 'bg-orange-500' : 'bg-blue-600'}`}>
              {editingId ? 'Update' : 'Add Staff'}
            </button>
            {editingId && (
              <button type="button" onClick={() => {setEditingId(null); setForm({name:'', position:'', code:''})}} className="px-4 py-3 bg-gray-200 rounded-lg">Cancel</button>
            )}
          </div>
        </form>
        
        {staff.length > 0 && (
          <div className="flex gap-2 mt-6">
            <button 
              onClick={() => handlePrint()} 
              className="flex-grow bg-green-600 text-white py-4 rounded-lg font-black uppercase tracking-widest shadow-lg"
            >
              Print Badges
            </button>
            <button 
              onClick={clearAll}
              className="px-4 bg-red-100 text-red-600 rounded-lg font-bold hover:bg-red-200"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* A4 Sheet Preview */}
      <div className="flex justify-center pb-20">
        <div 
          ref={contentRef} 
          className="bg-white shadow-2xl p-[10mm] w-[210mm] min-h-[297mm] grid grid-cols-2 gap-x-4 gap-y-6 content-start"
        >
          {staff.map((person) => (
            <div key={person.id} className="relative group flex justify-center">
              <Badge {...person} />
              
              <div className="absolute -top-3 -right-2 flex gap-2 no-print">
                 <button onClick={() => startEdit(person)} className="bg-orange-500 text-white w-8 h-8 rounded-full shadow-md flex items-center justify-center">✎</button>
                 <button onClick={() => setStaff(staff.filter(s => s.id !== person.id))} className="bg-red-600 text-white w-8 h-8 rounded-full shadow-md flex items-center justify-center font-bold">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;