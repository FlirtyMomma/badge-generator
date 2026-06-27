export default function Navigation({ mode, setMode }) {
  return (
    <div className="flex bg-gray-100 p-1 rounded-lg mb-4 text-xs font-bold text-gray-500">
      <button 
        onClick={() => setMode('badges')} 
        className={`flex-1 py-1.5 rounded-md transition-all ${mode === 'badges' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'}`}
      >
        Tag Builder
      </button>
      <button 
        onClick={() => setMode('priceCheck')} 
        className={`flex-1 py-1.5 rounded-md transition-all ${mode === 'priceCheck' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'}`}
      >
        Scan Panel
      </button>
      <button 
        onClick={() => setMode('admin')} 
        className={`flex-1 py-1.5 rounded-md transition-all ${mode === 'admin' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'}`}
      >
        DB Master
      </button>
    </div>
  );
}