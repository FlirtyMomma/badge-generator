import { useReactToPrint } from 'react-to-print';
import Badge from './Badge';

export default function BadgeBuilder({ 
  contentRef, 
  layoutMode = "leftColumn",
  staff,
  setStaff,
  form,
  setForm,
  editingId,
  setEditingId
}) {

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: "OneBeyond_Staff_Badges_Sheet",
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

  // --- RENDER PORTION A: Control Column Actions ---
  if (layoutMode === "leftColumn") {
    return (
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full border p-3 rounded-lg text-sm outline-none focus:border-blue-500" placeholder="Staff Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input className="w-full border p-3 rounded-lg text-sm outline-none focus:border-blue-500" placeholder="Position (e.g. Store Manager)" value={form.position} onChange={e => setForm({...form, position: e.target.value})} />
          <input className="w-full border p-3 rounded-lg text-sm font-mono outline-none focus:border-blue-500" placeholder="Till Access Code" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
          <button type="submit" className={`w-full text-white py-3 rounded-lg font-bold shadow-md transition-all ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#004aad] hover:bg-blue-800'}`}>
            {editingId ? 'Update Badge Configuration' : 'Add to Printable Sheet'}
          </button>
          {staff.length > 0 && (
            <button onClick={handlePrint} type="button" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold mt-2 shadow-md">
              🖨️ Open Print Options Menu
            </button>
          )}
        </form>

        {/* Formatted layout to place 2 badges horizontally side-by-side with uniform distribution gaps */}
        <div className="hidden">
          <div 
            ref={contentRef} 
            className="print:grid bg-white p-[10mm] w-[210mm] min-w-[210mm] min-h-[297mm] grid grid-cols-2 gap-x-[10mm] gap-y-[8mm] justify-items-center content-start text-black fixed inset-0 z-[999999]"
          >
            {staff.map((person) => (
              <div key={person.id} className="relative flex justify-center w-[85mm] h-[55mm] break-inside-avoid">
                {/* INJECTING ASTERISKS FOR CODE 39 SCANNABILITY */}
                <Badge {...person} code={`*${person.code}*`} />
              </div>
            ))}
          </div>
        </div>

        {/* Mobile List Fallback */}
        {staff.length > 0 && (
          <div className="pt-4 border-t border-gray-200 xl:hidden no-print">
            <h3 className="text-xs font-black uppercase text-gray-500 tracking-wider mb-3">Added Badges ({staff.length})</h3>
            <div className="flex flex-col items-center gap-4 max-h-[350px] overflow-y-auto p-1">
              {staff.map((person) => (
                <div key={person.id} className="relative flex justify-center w-full max-w-[85mm] h-[55mm] shadow-md rounded-lg overflow-hidden flex-shrink-0">
                  {/* INJECTING ASTERISKS FOR CODE 39 SCANNABILITY */}
                  <Badge {...person} code={`*${person.code}*`} />
                  <div className="absolute top-2 right-2 flex gap-2">
                     <button onClick={() => startEdit(person)} className="bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">✎</button>
                     <button onClick={() => setStaff(staff.filter(s => s.id !== person.id))} className="bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- RENDER PORTION B: PC Grid View Workspace ---
  if (layoutMode === "rightColumn" && staff.length > 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 min-h-[500px]">
        <h3 className="text-sm font-black uppercase text-gray-700 tracking-wider mb-4 pb-2 border-b">
          Active Badge Sheet Preview ({staff.length} Added)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[700px] overflow-y-auto p-2 justify-items-center">
          {staff.map((person) => (
            <div key={person.id} className="relative group flex justify-center w-[85mm] h-[55mm] shadow-md rounded-xl overflow-hidden hover:shadow-xl transition-shadow bg-white border">
              {/* INJECTING ASTERISKS FOR CODE 39 SCANNABILITY */}
              <Badge {...person} code={`*${person.code}*`} />
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                 <button onClick={() => startEdit(person)} className="bg-orange-500 hover:bg-orange-600 text-white w-8 h-8 rounded-full shadow-lg flex items-center justify-center font-bold">✎</button>
                 <button onClick={() => setStaff(staff.filter(s => s.id !== person.id))} className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded-full shadow-lg flex items-center justify-center font-bold">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}