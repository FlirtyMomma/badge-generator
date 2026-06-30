export default function Navigation({ mode, setMode, isSystemAdmin, session, storeId, onLogout }) {
  return (
    <div className="flex flex-wrap bg-gray-100 p-1 rounded-lg mb-4 text-xs font-bold text-gray-500 gap-y-1">
      <button 
        onClick={() => setMode('badges')} 
        className={`flex-1 min-w-[70px] py-1.5 rounded-md transition-all ${mode === 'badges' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'}`}
      >
        Tag Builder
      </button>
      <button 
        onClick={() => setMode('priceCheck')} 
        className={`flex-1 min-w-[70px] py-1.5 rounded-md transition-all ${mode === 'priceCheck' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'}`}
      >
        Scan Panel
      </button>
      
      {/* Dynamic Auth Tab: If logged in, show their active store portal link, otherwise show Login option */}
      {session ? (
        <button 
          onClick={() => setMode('legacy')} 
          className={`flex-1 min-w-[70px] py-1.5 rounded-md transition-all ${mode === 'legacy' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-600 hover:bg-emerald-50'}`}
        >
          📦 {storeId || 'Store'} Legacy
        </button>
      ) : (
        <button 
          onClick={() => setMode('login')} 
          className={`flex-1 min-w-[70px] py-1.5 rounded-md transition-all ${mode === 'login' ? 'bg-gray-900 text-white shadow-sm' : 'hover:text-gray-900'}`}
        >
          🔑 Sign In
        </button>
      )}
      
      {isSystemAdmin && (
        <button 
          onClick={() => setMode('admin')} 
          className={`flex-1 min-w-[70px] py-1.5 rounded-md transition-all ${mode === 'admin' ? 'bg-red-600 text-white shadow-sm' : 'hover:text-red-600'}`}
        >
          DB Master
        </button>
      )}
    </div>
  );
}