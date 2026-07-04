import { useEffect, useRef } from 'react';

export default function SavedBatchList({ savedProducts, setSavedProducts, setActiveZoomBarcode }) {
  const handleClearList = () => {
    if (window.confirm("Are you sure you want to clear your saved product batch?")) {
      setSavedProducts([]);
    }
  };

  if (savedProducts.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 min-h-[500px] no-print">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
        <h3 className="text-sm font-black uppercase text-[#004aad] tracking-widest">
          Saved Batch List ({savedProducts.length} Items)
        </h3>
        <button 
          onClick={handleClearList} 
          className="text-[10px] bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-black uppercase tracking-wider hover:bg-red-100 transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Responsive Grid view for desktop, clean scrollable box for mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[700px] overflow-y-auto p-1">
        {savedProducts.map((product) => (
          <div 
            key={product.savedAt} 
            className="bg-white border border-gray-100 rounded-xl p-3 relative flex gap-3 items-center shadow-sm hover:shadow-md hover:border-[#004aad]/30 transition-all group"
          >
            <button 
              onClick={() => setActiveZoomBarcode(product)} 
              className="bg-gray-50 p-1 border border-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center w-[95px] h-[60px] cursor-zoom-in hover:bg-white transition-colors"
              title="Tap to maximise barcode"
            >
              <BarcodeThumbnail value={product.barcode} />
            </button>
            
            <div className="flex-grow min-w-0 pr-6">
              <h4 className="text-xs font-black text-gray-800 truncate uppercase tracking-tight">{product.name}</h4>
              <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1 flex gap-2">
                <span>CD: <strong className="text-gray-600">{product.productCode}</strong></span>
                <span>BC: <strong className="text-gray-600">{product.barcode}</strong></span>
              </div>
              <p className="text-sm font-black text-[#004aad] mt-1">£{product.price}</p>
            </div>
            
            <button 
              onClick={() => setSavedProducts(savedProducts.filter(p => p.savedAt !== product.savedAt))} 
              className="absolute top-2 right-2 text-gray-300 hover:text-red-600 bg-white hover:bg-red-50 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mini component to safely render the barcode thumbnails
const BarcodeThumbnail = ({ value }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && window.JsBarcode) {
      window.JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width: 1.5,
        height: 40,
        displayValue: false,
        margin: 0,
        background: "transparent",
        lineColor: "#000000"
      });
    }
  }, [value]);

  return (
    <svg ref={svgRef} className="max-w-full max-h-full object-contain pointer-events-none"></svg>
  );
};