export default function Navigation({ mode, setMode, isSystemAdmin, session, storeId }) {

  
  // Base: Bordered, rounded, and subtle transitions
  const baseBtn = "flex-1 md:flex-none min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg transition-all duration-300 uppercase font-black text-[10px] tracking-widest border";
  
  // Active: Deep blue with a subtle "lifted" shadow to create depth
  const activeClass = "bg-[#004aad] text-white border-[#004aad] shadow-md transform scale-[1.02]";
  
  // Inactive: Crisp white background, subtle inner shadow to make them look "pressed" into the bar
  const inactiveClass = "bg-white text-gray-500 border-gray-200 shadow-inner hover:bg-gray-50 hover:border-[#004aad]/30 hover:text-[#004aad]";

  return (
    <div className="flex flex-wrap justify-start md:justify-center bg-gray-50 p-1.5 rounded-xl text-[11px] md:text-xs font-black gap-1.5 shadow-inner border border-gray-200 md:w-fit md:mx-auto">
      
      <button 
        onClick={() => setMode('priceCheck')} 
        className={`${baseBtn} ${mode === 'priceCheck' ? activeClass : inactiveClass}`}
      >
        Price Checker
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