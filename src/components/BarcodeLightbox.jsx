export default function BarcodeLightbox({ activeZoomBarcode, setActiveZoomBarcode }) {
  if (!activeZoomBarcode) return null;

  return (
    <div 
      onClick={() => setActiveZoomBarcode(null)}
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 backdrop-blur-md cursor-zoom-out"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center border border-white/10 text-center" onClick={(e) => e.stopPropagation()}>
        <p className="text-[11px] font-black text-[#004aad] tracking-widest uppercase mb-1">OneBeyond Gun Scanner Target</p>
        <h3 className="text-base font-black text-gray-900 uppercase leading-tight mb-4 px-2 truncate w-full">{activeZoomBarcode.name}</h3>
        
        <div className="bg-white border-2 border-gray-100 rounded-xl p-4 w-full flex items-center justify-center min-h-[140px] shadow-inner mb-4">
          <img 
            src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(activeZoomBarcode.barcode)}&code=Code128&translate-esc=true&quiet=15`}
            alt={activeZoomBarcode.barcode}
            className="w-full h-auto max-h-[120px] object-contain select-none"
          />
        </div>

        <div className="flex gap-4 justify-center text-xs font-mono text-gray-500 mb-6 bg-gray-50 px-4 py-2 rounded-lg w-full">
          <span>CODE: <strong className="text-gray-800">{activeZoomBarcode.productCode}</strong></span>
          <span>PRICE: <strong className="text-[#004aad] font-bold">{activeZoomBarcode.price}</strong></span>
        </div>

        <button onClick={() => setActiveZoomBarcode(null)} className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl font-bold uppercase text-xs tracking-wider shadow-md">
          ✕ Close Target View
        </button>
      </div>
    </div>
  );
}