export default function Navigation({ mode, setMode, isSystemAdmin, session, storeId }) {
  const baseBtn = "flex-1 md:flex-none min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-3 md:px-5 rounded-lg transition-all duration-200 shadow-none border border-transparent";
  const activeClass = "bg-white text-[#004aad] shadow-sm border-gray-200/60 ring-1 ring-black/5";
  const inactiveClass = "hover:text-gray-900 hover:bg-gray-200/50";

  return (
    // REMOVED: mb-6 so it sits perfectly inside the new header card
    <div className="flex flex-wrap justify-start md:justify-center bg-gray-100 p-1.5 rounded-xl text-[11px] md:text-xs font-black text-gray-500 gap-1.5 shadow-inner border border-gray-200 uppercase tracking-wide md:w-fit md:mx-auto">
      
      <button 
        onClick={() => setMode('priceCheck')} 
        className={`${baseBtn} ${mode === 'priceCheck' ? activeClass : inactiveClass}`}
      >
        Scanner
      </button>
      
      {session && (
        <>
          <button 
            onClick={() => setMode('badges')} 
            className={`${baseBtn} ${mode === 'badges' ? activeClass : inactiveClass}`}
          >
            Badges
          </button>

          <button 
            onClick={() => setMode('legacy')} 
            className={`${baseBtn} ${mode === 'legacy' ? activeClass : inactiveClass}`}
          >
           {storeId || 'Store'} Legacy
          </button>
          
          <button 
            onClick={() => setMode('stockTake')} 
            className={`${baseBtn} ${mode === 'stockTake' ? activeClass : inactiveClass}`}
          >
            Stock
          </button>

          <button 
            onClick={() => setMode('history')} 
            className={`${baseBtn} ${mode === 'history' ? activeClass : inactiveClass}`}
          >
            Audit Trail
          </button>
        </>
      )}

      {!session && (
        <button 
          onClick={() => setMode('login')} 
          className={`${baseBtn} ${mode === 'login' ? activeClass : inactiveClass}`}
        >
          Sign In
        </button>
      )}
      
      {isSystemAdmin && (
        <button 
          onClick={() => setMode('admin')} 
          className={`${baseBtn} ${mode === 'admin' ? activeClass : inactiveClass}`}
        >
          DB Master
        </button>
      )}
    </div>
  );
}