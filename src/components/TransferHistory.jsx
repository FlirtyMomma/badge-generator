import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function TransferHistory({ storeId }) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    
    const fetchHistory = async () => {
      setLoading(true);
      // Fetch any logs where this store was either the sender or the receiver
      const { data, error } = await supabase
        .from('transfer_history')
        .select('*')
        .or(`origin_store.eq.${storeId},destination_store.eq.${storeId}`)
        .order('transferred_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setTransfers(data);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [storeId]);

  if (loading) {
    return <div className="text-center p-8 text-gray-500 font-bold animate-pulse">Loading Audit Trail...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <div className="bg-[#004aad] text-white p-4">
        <h2 className="text-lg font-black uppercase tracking-wide">Digital Audit Trail</h2>
        <p className="text-xs font-medium text-blue-200">Recent manifest activity for Store {storeId}</p>
      </div>
      
      {transfers.length === 0 ? (
        <div className="p-10 text-center text-gray-500">
          <p className="font-bold text-lg">No Transfer History</p>
          <p className="text-sm mt-1">There are no recorded inbound or outbound transfers for your store yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                <th className="p-3 font-black">Date</th>
                <th className="p-3 font-black">Direction</th>
                <th className="p-3 font-black">Season & Pallet</th>
                <th className="p-3 font-black">Quantity</th>
                <th className="p-3 font-black">Other Store</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {transfers.map((log) => {
                const isIncoming = log.destination_store === storeId;
                const dateStr = new Date(log.transferred_at).toLocaleString('en-GB', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                });

                return (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-mono text-xs text-gray-600 whitespace-nowrap">{dateStr}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-black uppercase tracking-wide ${
                        isIncoming ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isIncoming ? '⬇ Inbound' : '⬆ Outbound'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-gray-900">{log.season}</div>
                      <div className="text-xs text-gray-500">{log.pallet_name}</div>
                    </td>
                    <td className="p-3 font-black text-gray-800">{log.items_moved} items</td>
                    <td className="p-3 font-medium text-gray-600">
                      {isIncoming ? log.origin_store : log.destination_store}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}