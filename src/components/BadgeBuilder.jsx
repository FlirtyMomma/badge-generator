import { useReactToPrint } from 'react-to-print';
import Badge from './Badge';
import { supabase } from '../supabaseClient';

export default function BadgeBuilder({ 
  session,
  activeStaff,
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
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 15mm;
      }
    `
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.code || !session?.user?.id) return;

    if (editingId) {
      const { error } = await supabase.from('store_staff').update({
        name: form.name,
        position: form.position || 'Sales Assistant',
        code: form.code,
        pin: form.pin || null
      }).eq('id', editingId);
      
      if (!error) {
        setStaff(staff.map(s => s.id === editingId ? { ...s, ...form } : s));
        setEditingId(null);
      } else {
        alert('Failed to update badge.');
      }
    } else {
      const newBadge = {
        user_id: session.user.id,
        name: form.name,
        position: form.position || 'Sales Assistant',
        code: form.code,
        pin: form.pin || null
      };
      const { data, error } = await supabase.from('store_staff').insert([newBadge]).select().single();
      
      if (data && !error) {
        setStaff([...staff, data]);
      } else {
        alert('Failed to save badge.');
      }
    }
    setForm({ name: '', position: 'Sales Assistant', code: '', pin: '' });
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('store_staff').delete().eq('id', id);
    if (!error) {
      setStaff(staff.filter(s => s.id !== id));
    } else {
      alert('Failed to delete badge.');
    }
  };

  const startEdit = (person) => {
    setEditingId(person.id);
    setForm({ name: person.name, position: person.position, code: person.code, pin: person.pin || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasPermission = !activeStaff || ['Store Manager', 'Assistant Manager'].includes(activeStaff.position);

  if (!hasPermission && layoutMode === "leftColumn") {
    return (
      <div className="bg-red-50 text-red-600 p-8 rounded-xl text-center shadow-sm border border-red-200">
        <h2 className="text-xl font-black uppercase tracking-wider mb-2">Access Denied</h2>
        <p className="font-bold text-sm">Only Managers and Assistant Managers can create or modify staff badges.</p>
      </div>
    );
  }

  if (!hasPermission && layoutMode === "rightColumn") {
    return null;
  }

  // --- RENDER PORTION A: Control Column Actions ---
  if (layoutMode === "leftColumn") {
    return (
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <input className="w-full border p-3 rounded-lg text-sm outline-none focus:border-blue-500" placeholder="Staff Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <select 
            className="w-full border p-3 rounded-lg text-sm font-bold text-gray-700 outline-none focus:border-[#004aad] bg-white"
            value={form.position || 'Sales Assistant'}
            onChange={e => setForm({...form, position: e.target.value})}
          >
            <option value="Store Manager">Store Manager</option>
            <option value="Assistant Manager">Assistant Manager</option>
            <option value="Supervisor">Supervisor</option>
            <option value="Sales Assistant">Sales Assistant</option>
          </select>
          <div className="flex gap-2">
            <input className="w-2/3 border p-3 rounded-lg text-sm font-mono outline-none focus:border-blue-500" placeholder="Till Access Code" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
            <input className="w-1/3 border p-3 rounded-lg text-sm font-mono outline-none focus:border-blue-500 text-center" placeholder="App PIN (Optional)" value={form.pin || ''} onChange={e => setForm({...form, pin: e.target.value})} maxLength={6} />
          </div>
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
            className="print:flex bg-white flex flex-wrap justify-center content-start text-black"
          >
            {/* The transparent top border acts as a guaranteed top-margin for every page, bypassing browser print margin settings */}
            {staff.map((person) => (
              <div key={person.id} className="relative flex justify-center w-[85mm] break-inside-avoid border-t-[15mm] border-transparent mx-[5mm]">
                <Badge {...person} />
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
                  <Badge {...person} />
                  <div className="absolute top-2 right-2 flex gap-2">
                     <button onClick={() => startEdit(person)} className="bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">✎</button>
                     <button onClick={() => handleDelete(person.id)} className="bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">🗑</button>
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
              <Badge {...person} />
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                 <button onClick={() => startEdit(person)} className="bg-orange-500 hover:bg-orange-600 text-white w-8 h-8 rounded-full shadow-lg flex items-center justify-center font-bold">✎</button>
                 <button onClick={() => handleDelete(person.id)} className="bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded-full shadow-lg flex items-center justify-center font-bold">🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}