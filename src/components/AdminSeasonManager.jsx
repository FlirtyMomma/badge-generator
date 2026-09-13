import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-hot-toast';

export default function AdminSeasonManager() {
  const [seasons, setSeasons] = useState([]);
  const [newSeason, setNewSeason] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('app_seasons').select('*').order('created_at');
    if (!error && data) {
      setSeasons(data);
    } else {
      console.error("Failed to load seasons", error);
    }
    setIsLoading(false);
  };

  const handleAddSeason = async (e) => {
    e.preventDefault();
    const cleanSeason = newSeason.trim();
    if (!cleanSeason) return;

    // Check for duplicates
    if (seasons.find(s => s.name.toLowerCase() === cleanSeason.toLowerCase())) {
      toast.error("Season already exists");
      return;
    }

    const { error } = await supabase.from('app_seasons').insert([{ name: cleanSeason }]);
    if (error) {
      toast.error("Failed to add season");
      console.error(error);
    } else {
      toast.success("Season added! Please refresh the page to apply everywhere.");
      setNewSeason('');
      fetchSeasons();
    }
  };

  const handleDeleteSeason = (id, name) => {
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <span className="text-sm font-bold text-gray-800">Delete "{name}"?</span>
        <p className="text-[10px] text-red-600">This will remove the season from all dropdowns. It will NOT delete existing scan data.</p>
        <div className="flex gap-2 justify-center mt-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold uppercase">Cancel</button>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              const { error } = await supabase.from('app_seasons').delete().eq('id', id);
              if (!error) {
                toast.success("Season deleted! Please refresh the page.");
                fetchSeasons();
              } else {
                toast.error("Failed to delete season");
              }
            }} 
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase shadow-md"
          >Delete</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  return (
    <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-xs mb-6">
      <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider mb-4 border-b pb-2">📅 Manage Seasons</h3>
      
      <form onSubmit={handleAddSeason} className="flex gap-2 mb-6">
        <input 
          type="text" 
          value={newSeason} 
          onChange={(e) => setNewSeason(e.target.value)}
          placeholder="New Season Name (e.g. Back to School)" 
          className="flex-1 border p-2 rounded text-sm font-bold bg-gray-50 outline-none focus:border-[#004aad]"
        />
        <button type="submit" className="bg-[#004aad] text-white px-4 py-2 rounded font-bold text-xs uppercase tracking-wider hover:bg-blue-800 transition-colors">
          Add
        </button>
      </form>

      {isLoading ? (
        <p className="text-center text-xs font-bold text-gray-400 py-4">Loading seasons...</p>
      ) : seasons.length === 0 ? (
        <p className="text-center text-xs font-bold text-gray-400 py-4">No seasons found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {seasons.map(s => (
            <div key={s.id} className="border border-gray-100 bg-gray-50 p-3 rounded flex justify-between items-center group hover:border-gray-200 transition-colors">
              <span className="text-sm font-bold text-gray-800">{s.name}</span>
              <button 
                onClick={() => handleDeleteSeason(s.id, s.name)}
                className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                title="Delete Season"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
