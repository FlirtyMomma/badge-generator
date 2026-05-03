import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import Badge from './components/Badge';

function App() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: '', position: '', code: '' });
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const addStaff = (e) => {
    e.preventDefault();
    if (!form.name || !form.code) return;
    setStaff([...staff, { ...form, id: Date.now() }]);
    setForm({ name: '', position: '', code: '' }); // Reset form
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* UI Controls - Hidden during print */}
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md mb-8">
        <h1 className="text-xl font-bold mb-4">Staff Badge Generator</h1>
        <form onSubmit={addStaff} className="space-y-3">
          <input 
            className="w-full border p-2 rounded" 
            placeholder="Staff Name" 
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
          />
          <input 
            className="w-full border p-2 rounded" 
            placeholder="Position (Optional)" 
            value={form.position}
            onChange={e => setForm({...form, position: e.target.value})}
          />
          <input 
            className="w-full border p-2 rounded" 
            placeholder="Till Code" 
            value={form.code}
            onChange={e => setForm({...form, code: e.target.value})}
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">Add Staff</button>
        </form>
        
        <button 
          onClick={handlePrint}
          className="w-full mt-4 bg-green-600 text-white py-2 rounded font-bold"
        >
          Print All Badges
        </button>
      </div>

      {/* Printable Sheet Area */}
      <div className="flex justify-center">
        <div ref={componentRef} className="grid grid-cols-2 gap-2 p-[10mm] bg-white w-[210mm]">
          {staff.map((person) => (
            <Badge key={person.id} {...person} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;