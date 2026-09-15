import React, { useState } from 'react';

export default function ActionDashboard({ storeId }) {
  // Static state for the prototype to make it interactive for the pitch
  const [tasks, setTasks] = useState([
    { id: 1, type: 'hs', title: 'Monthly Fire Extinguisher Audit', status: 'overdue', desc: 'Overdue by 2 days. Complete immediately.' },
    { id: 2, type: 'stock', title: 'Pull Expiring Stock', status: 'overdue', desc: '12x Walkers Ready Salted (Crisps Section)' },
    { id: 3, type: 'stock', title: 'Weekly Date Check: Crisps & Snacks', status: 'pending', desc: 'Log anything expiring before 15th Dec' },
    { id: 4, type: 'hs', title: 'Weekly Fire Alarm Call-Point Test', status: 'pending', desc: 'Test point 4 (Warehouse)' },
    { id: 5, type: 'ops', title: 'Daily Floor Walk', status: 'completed', desc: 'Completed today at 08:15 AM by Josh' }
  ]);

  const toggleTask = (id) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        if (t.status === 'completed') return { ...t, status: t.originalStatus || 'pending' };
        return { ...t, status: 'completed', originalStatus: t.status };
      }
      return t;
    }));
  };

  const overdueTasks = tasks.filter(t => t.status === 'overdue');
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const getIcon = (type) => {
    switch(type) {
      case 'hs': return '🦺';
      case 'stock': return '📦';
      case 'ops': return '📋';
      default: return '📌';
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20 mt-4 px-2">
      {/* Header */}
      <div className="bg-[#004aad] rounded-2xl p-6 text-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
        <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-1">
          Store {storeId || '104'}
        </h2>
        <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">
          Unified Action Board
        </p>
      </div>

      {/* Prototype Warning Banner */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg shadow-sm">
        <p className="text-[10px] text-yellow-700 font-black uppercase tracking-wide">
          Interactive Prototype: Tap tasks to mark them complete
        </p>
      </div>

      {/* Overdue Section */}
      {overdueTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-black uppercase text-red-600 tracking-wider flex items-center gap-2">
            <span>🚨</span> Critical / Overdue
          </h3>
          <div className="space-y-2">
            {overdueTasks.map(task => (
              <div 
                key={task.id} 
                onClick={() => toggleTask(task.id)}
                className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 items-start cursor-pointer hover:bg-red-100 transition-colors shadow-sm"
              >
                <div className="text-2xl">{getIcon(task.type)}</div>
                <div className="flex-1">
                  <h4 className="font-bold text-red-900 text-sm">{task.title}</h4>
                  <p className="text-xs text-red-700 mt-1 font-medium">{task.desc}</p>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-red-400 flex-shrink-0"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Section */}
      {pendingTasks.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-black uppercase text-gray-700 tracking-wider flex items-center gap-2">
            <span>📅</span> This Week
          </h3>
          <div className="space-y-2">
            {pendingTasks.map(task => (
              <div 
                key={task.id} 
                onClick={() => toggleTask(task.id)}
                className="bg-white border border-gray-200 rounded-xl p-4 flex gap-3 items-start cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
              >
                <div className="text-2xl">{getIcon(task.type)}</div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-sm">{task.title}</h4>
                  <p className="text-xs text-gray-500 mt-1 font-medium">{task.desc}</p>
                </div>
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Section */}
      {completedTasks.length > 0 && (
        <div className="space-y-3 pt-2 opacity-60">
          <h3 className="text-sm font-black uppercase text-green-700 tracking-wider flex items-center gap-2">
            <span>✅</span> Completed
          </h3>
          <div className="space-y-2">
            {completedTasks.map(task => (
              <div 
                key={task.id} 
                onClick={() => toggleTask(task.id)}
                className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3 items-start cursor-pointer shadow-sm"
              >
                <div className="text-2xl grayscale opacity-50">{getIcon(task.type)}</div>
                <div className="flex-1">
                  <h4 className="font-bold text-green-900 text-sm line-through decoration-green-300">{task.title}</h4>
                  <p className="text-xs text-green-700 mt-1 font-medium">{task.desc}</p>
                </div>
                <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-green-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
