import { useEffect, useRef, useState } from 'react';

export default function BarcodeLightbox({ activeZoomBarcode, setActiveZoomBarcode }) {
  const svgRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Dynamically inject the secure CDN script
  useEffect(() => {
    if (!activeZoomBarcode) return;
    
    if (window.JsBarcode) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js";
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "no-referrer";
    
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
  }, [activeZoomBarcode]);

  // Render the barcode once the script is ready
  useEffect(() => {
    if (scriptLoaded && svgRef.current && window.JsBarcode && activeZoomBarcode) {
      window.JsBarcode(svgRef.current, activeZoomBarcode.barcode, {
        format: "CODE128",
        width: 3.5, // Thick lines for easy scanning off a screen
        height: 120,
        displayValue: false, // We render the text manually below for better styling
        margin: 0,
        lineColor: "#000000",
        background: "transparent"
      });
    }
  }, [activeZoomBarcode, scriptLoaded]);

  if (!activeZoomBarcode) return null;

  return (
    <div 
      onClick={() => setActiveZoomBarcode(null)}
      className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-6 backdrop-blur-sm cursor-zoom-out"
    >
      <div 
        className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col items-center border border-gray-100 text-center transform scale-100 transition-all" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Premium Corporate Header */}
        <div className="bg-gradient-to-b from-[#005cc7] to-[#004aad] text-white w-full rounded-t-xl -mt-6 -mx-6 mb-6 p-4 rounded-b-none shadow-sm">
          <p className="text-[10px] font-black tracking-widest uppercase mb-1 text-[#ffcb05]">OneBeyond Scanner Target</p>
          <h3 className="text-sm font-black uppercase leading-tight px-2 truncate w-full">{activeZoomBarcode.name}</h3>
        </div>
        
        {/* Crisp Barcode Canvas */}
        <div className="bg-white border-2 border-gray-100 rounded-xl p-4 w-full flex items-center justify-center min-h-[150px] shadow-inner mb-4">
          {!scriptLoaded ? (
            <p className="text-xs text-gray-400 animate-pulse font-bold">Rendering Barcode...</p>
          ) : (
            <svg ref={svgRef} className="w-full h-auto max-h-[130px] object-contain select-none"></svg>
          )}
        </div>

        {/* Scaled Barcode Text */}
        <p className="text-2xl font-black tracking-widest text-gray-800 mb-4">{activeZoomBarcode.barcode}</p>

        {/* Data Readout Tiles */}
        <div className="flex gap-4 justify-center text-xs font-mono text-gray-500 mb-6 bg-gray-50 px-4 py-3 rounded-lg w-full border border-gray-100 shadow-inner">
          <span className="flex flex-col items-center">
            <span className="text-[9px] font-black uppercase tracking-wider">Product Code</span>
            <strong className="text-gray-800 text-sm">{activeZoomBarcode.productCode}</strong>
          </span>
          <div className="w-px bg-gray-300"></div>
          <span className="flex flex-col items-center">
            <span className="text-[9px] font-black uppercase tracking-wider">Unit Price</span>
            <strong className="text-[#004aad] font-black text-sm">£{activeZoomBarcode.price}</strong>
          </span>
        </div>

        {/* Premium Ghost Button */}
        <button 
          onClick={() => setActiveZoomBarcode(null)} 
          className="w-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-[#004aad] hover:border-[#004aad]/30 py-3 rounded-xl font-black uppercase text-xs tracking-wider shadow-sm transition-all"
        >
          ✕ Close Target View
        </button>
      </div>
    </div>
  );
}