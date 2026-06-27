export default function SavedBatchList({ savedProducts, setSavedProducts, setActiveZoomBarcode }) {
  const handleClearList = () => {
    if (window.confirm("Are you sure you want to clear your saved product batch?")) {
      setSavedProducts([]);
    }
  };

  if (savedProducts.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 min-h-[500px] no-print">
      <div className="flex justify-between items-center mb-4 pb-2 border-b">
        <h3 className="text-sm font-black uppercase text-gray-700 tracking-wider">
          Saved Batch List ({savedProducts.length} Items)
        </h3>
        <button 
          onClick={handleClearList} 
          className="text-xs text-red-600 font-bold uppercase hover:underline"
        >
          Clear All
        </button>
      </div>

      {/* Responsive Grid view for desktop, clean scrollable box for mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[700px] overflow-y-auto p-1">
        {savedProducts.map((product) => (
          <div 
            key={product.savedAt} 
            className="bg-gray-50 border border-gray-200 rounded-xl p-3 relative flex gap-3 items-center shadow-xs hover:shadow-md transition-shadow bg-white"
          >
            <button 
              onClick={() => setActiveZoomBarcode(product)} 
              className="bg-white p-1 border border-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center w-[95px] h-[60px] cursor-zoom-in hover:bg-gray-50 transition-colors"
              title="Tap to maximize barcode"
            >
              <img 
                src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(product.barcode)}&code=Code128&translate-esc=true&quiet=10`} 
                alt={product.barcode} 
                className="max-w-full max-h-full object-contain pointer-events-none" 
              />
            </button>
            
            <div className="flex-grow min-w-0 pr-6">
              <h4 className="text-xs font-bold text-gray-900 truncate uppercase tracking-tight">{product.name}</h4>
              <div className="text-[10px] font-mono text-gray-400 mt-0.5 flex gap-2">
                <span>CD: {product.productCode}</span>
                <span>BC: {product.barcode}</span>
              </div>
              <p className="text-sm font-black text-[#004aad] mt-1">{product.price}</p>
            </div>
            
            <button 
              onClick={() => setSavedProducts(savedProducts.filter(p => p.savedAt !== product.savedAt))} 
              className="absolute top-2 right-2 text-gray-400 hover:text-red-600 font-bold text-xs p-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}