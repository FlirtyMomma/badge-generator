import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const SEASONS = ["Mothers Day", "Fathers Day", "Easter", "Halloween", "Xmas", "Garden", "Summer"];

export default function AdminNetworkDashboard() {
  const [season, setSeason] = useState('Mothers Day');
  const [metrics, setMetrics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [season]);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const { data: stores } = await supabase.from('store_profiles').select('*').order('store_id');
      const { data: pData } = await supabase.from('planogram_items').select('product_code, store_sizes').eq('season', season);
      const { data: scans } = await supabase.from('store_season_scans').select('store_id, barcode').eq('season', season);

      const expectedPerTier = {};
      ['A','B','C','D','E','F','G','H','I'].forEach(tier => {
        const uniqueCodes = new Set((pData || []).filter(item => item.store_sizes.includes(tier)).map(item => item.product_code));
        expectedPerTier[tier] = uniqueCodes.size;
      });

      const scansPerStore = {};
      (scans || []).forEach(scan => {
        if (!scansPerStore[scan.store_id]) scansPerStore[scan.store_id] = new Set();
        scansPerStore[scan.store_id].add(scan.barcode);
      });

      const builtMetrics = (stores || []).map(store => {
        const expected = expectedPerTier[store.store_size || 'A'] || 0;
        const scannedSet = scansPerStore[store.store_id] || new Set();
        const scanned = scannedSet.size;
        const percent = expected === 0 ? (scanned > 0 ? 100 : 0) : Math.min(100, Math.round((scanned / expected) * 100));

        return { ...store, expected, scanned, percent };
      });

      builtMetrics.sort((a, b) => {
        if (b.percent !== a.percent) return b.percent - a.percent;
        return a.store_id.localeCompare(b.store_id);
      });

      setMetrics(builtMetrics);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
    setIsLoading(false);
  };

  return (
    <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-4 shadow-xs">
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="text-xs font-black uppercase text-gray-700 tracking-wider">🌍 National Setup Progress</h3>
        
        <select 
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          className="bg-white border rounded text-xs font-bold p-1 outline-none focus:border-[#004aad]"
        >
          {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {isLoading ? (
          <p className="text-center text-xs font-bold text-gray-400 py-4">Compiling National Data...</p>
        ) : metrics.length === 0 ? (
          <p className="text-center text-xs font-bold text-gray-400 py-4">No stores registered.</p>
        ) : (
          metrics.map(store => (
            <div key={store.id} className="bg-white p-3 rounded shadow-sm border border-gray-100 flex flex-col gap-2 relative overflow-hidden group">
              <div className="flex justify-between items-end relative z-10">
                <div>
                  <h4 className="text-sm font-black text-gray-800">{store.store_name} <span className="text-gray-400 font-normal">#{store.store_id}</span></h4>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-1.5 py-0.5 rounded">Tier {store.store_size || 'A'}</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-[#004aad]">{store.percent}%</div>
                  <div className="text-[10px] font-bold text-gray-500">
                    {store.scanned} / {store.expected} Scanned
                  </div>
                </div>
              </div>
              
              {/* Progress Bar Container */}
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden relative z-10">
                <div 
                  className={`h-full transition-all duration-1000 ${store.percent === 100 ? 'bg-green-500' : 'bg-[#004aad]'}`}
                  style={{ width: `${store.percent}%` }}
                />
              </div>

              {/* Background Status Graphic */}
              {store.percent === 100 && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[80px] opacity-[0.03] rotate-12 pointer-events-none select-none">
                  ✅
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      <div className="pt-2 flex justify-between items-center">
        <button 
          onClick={() => {
            if (metrics.length === 0) return;
            const headers = ['Store ID', 'Store Name', 'Tier', 'Season', 'Expected Items', 'Scanned Items', 'Completion (%)'];
            const rows = metrics.map(store => [
              store.store_id,
              `"${store.store_name}"`,
              store.store_size || 'A',
              season,
              store.expected,
              store.scanned,
              store.percent
            ]);
            const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `OB_Hub_${season.replace(/\s+/g, '_')}_Progress.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          className="text-[10px] font-bold bg-[#004aad] text-white px-3 py-1.5 rounded shadow-sm hover:bg-blue-800 transition-colors uppercase tracking-wider"
        >
          📊 Export CSV
        </button>
        <button 
          onClick={fetchMetrics}
          className="text-[10px] font-bold bg-white border px-3 py-1.5 rounded shadow-sm hover:bg-gray-50 text-gray-600 transition-colors"
        >
          🔄 Refresh Live Data
        </button>
      </div>
    </div>
  );
}
