export default function Navigation({ mode, setMode, isSystemAdmin, session, storeId }) {
  // Base styling applied to all buttons to keep the component clean and uniform
  const baseBtn = "flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition-all duration-200 shadow-none border border-transparent";
  
  return (
    <div className="flex flex-wrap bg-gray-100 p-1.5 rounded-xl mb-6 text-[11px] md:text-xs font-black text-gray-500 gap-1.5 shadow-inner border border-gray-200 uppercase tracking-wide">
      
      <button 
        onClick={() => setMode('badges')} 
        className={`${baseBtn} ${mode === 'badges' ? 'bg-white text-[#004aad] shadow-sm border-gray-200/60 ring-1 ring-black/5' : 'hover:text-gray-900 hover:bg-gray-200/50'}`}
      >
        🪪 Badges
      </button>
      
      <button 
        onClick={() => setMode('priceCheck')} 
        className={`${baseBtn} ${mode === 'priceCheck' ? 'bg-white text-[#004aad] shadow-sm border-gray-200/60 ring-1 ring-black/5' : 'hover:text-gray-900 hover:bg-gray-200/50'}`}
      >
        📷 Scanner
      </button>
      
      {session && (
        <>
          <button 
            onClick={() => setMode('legacy')} 
            className={`${baseBtn} ${mode === 'legacy' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-700 bg-emerald-100/50 hover:bg-emerald-100'}`}
          >
            📦 {storeId || 'Store'}
          </button>
          
          <button 
            onClick={() => setMode('stockTake')} 
            className={`${baseBtn} ${mode === 'stockTake' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-700 bg-blue-100/50 hover:bg-blue-100'}`}
          >
            📋 Stock
          </button>

          {/* NEW AUDIT TRAIL TAB */}
          <button 
            onClick={() => setMode('history')} 
            className={`${baseBtn} ${mode === 'history' ? 'bg-amber-500 text-white shadow-md' : 'text-amber-800 bg-amber-100/60 hover:bg-amber-200/70'}`}
          >
            📜 Audit Trail
          </button>
        </>
      )}

      {!session && (
        <button 
          onClick={() => setMode('login')} 
          className={`${baseBtn} ${mode === 'login' ? 'bg-gray-900 text-white shadow-md' : 'hover:text-gray-900 hover:bg-gray-200/50'}`}
        >
          🔑 Sign In
        </button>
      )}
      
      {isSystemAdmin && (
        <button 
          onClick={() => setMode('admin')} 
          className={`${baseBtn} ${mode === 'admin' ? 'bg-red-600 text-white shadow-md' : 'text-red-700 bg-red-100/50 hover:bg-red-100'}`}
        >
          ⚙️ DB Master
        </button>
      )}
    </div>
  );
}