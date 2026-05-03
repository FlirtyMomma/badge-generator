import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import Badge from './components/Badge';

function App() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: '', position: '', code: '' });
  const [editingId, setEditingId] = useState(null); // Track which ID we are editing
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.code) return;

    if (editingId) {
      // Update existing
      setStaff(staff.map(s => s.id === editingId ? { ...form, id: editingId } : s));
      setEditingId(null);
    } else {
      // Add new
      setStaff([...staff, { ...form, id: Date.now() }]);
    }
    setForm({ name: '', position: '', code: '' });
  };

  const startEdit = (person) => {
    setEditingId(person.id);
    setForm({ name: person.name, position: person.position, code: person.code });
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Pop back to top to edit
  };

  const deleteStaff = (id) => {
    setStaff(staff.filter(s => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 pb-24">
      {/* Input Form */}
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-lg mb-10 border border-gray-200">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          {editingId ? 'Edit Staff Member' : 'Add New Staff'}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input 
            className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition-all" 
            placeholder="Staff Name" 
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
          />
          <input 
            className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition-all" 
            placeholder="Position" 
            value={form.position}
            onChange={e => setForm({...form, position: e.target.value})}
          />
          <input 
            className="w-full border-2 border-gray-200 p-3 rounded-lg focus:border-blue-500 outline-none transition-all font-mono" 
            placeholder="Till Code" 
            value={form.code}
            onChange={e => setForm({...form, code: e.target.value})}
          />
          <div className="flex gap-2">
            <button type="submit" className={`flex-grow py-3 rounded-lg font-bold text-white transition-colors ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {editingId ? 'Update Badge' : 'Add to Sheet'}
            </button>
            {editingId && (
              <button 
                type="button" 
                onClick={() => {setEditingId(null); setForm({name:'', position:'', code:''})}}
                className="px-4 py-3 bg-gray-200 rounded-lg font-bold text-gray-600"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        
        {staff.length > 0 && (
          <button 
            onClick={handlePrint}
            className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-black uppercase tracking-widest shadow-md transition-transform active:scale-95"
          >
            Print {staff.length} Badge{staff.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Grid of Badges with Controls */}
      <div className="flex flex-col items-center">
        <div ref={componentRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 p-[10mm] bg-white shadow-2xl border border-gray-300 rounded-sm">
          {staff.map((person) => (
            <div key={person.id} className="relative group">
              {/* Actual Badge Component */}
              <Badge {...person} />

              {/* Action Buttons - Hidden during Print via CSS or Logic */}
              <div className="absolute -top-3 -right-3 flex gap-2 no-print print:hidden">
                <button 
                  onClick={() => startEdit(person)}
                  className="bg-orange-500 text-white p-2 rounded-full shadow-lg hover:bg-orange-600 transition-transform hover:scale-110"
                  title="Edit"
                >
                  <EditIcon />
                </button>
                <button 
                  onClick={() => deleteStaff(person.id)}
                  className="bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition-transform hover:scale-110"
                  title="Delete"
                >
                  <DeleteIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Simple SVG Icons
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);

export default App;