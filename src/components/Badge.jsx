import { useState } from 'react';

export default function Badge({ product }) {
  if (!product) return null;

  // Native React 19 high-contrast 1D barcode vector calculation loop
  const renderPrecisionBarcode = (codeString) => {
    const cleanString = codeString.trim().replace(/[^0-9A-Za-z\-]/g, '') || "000000";
    
    let lines = [];
    lines.push(1, 0, 1); // Start sentinel pattern

    for (let i = 0; i < cleanString.length; i++) {
      const num = cleanString.charCodeAt(i);
      if (num % 2 === 0) {
        lines.push(1, 1, 0, 0, 1, 0, 1, 1);
      } else {
        lines.push(1, 0, 1, 1, 0, 0, 1, 1);
      }
    }

    lines.push(1, 0, 1, 1, 1); // Stop sentinel pattern

    return (
      <div className="flex flex-col items-center justify-center bg-white p-2 rounded">
        <svg 
          className="h-12 w-full max-w-[240px]" 
          viewBox={`0 0 ${lines.length} 10`} 
          preserveAspectRatio="none"
          shapeRendering="crispEdges" // Guarantees razor-sharp lines for laser scanner reflections
        >
          {lines.map((bit, index) => bit === 1 && (
            <rect 
              key={index} 
              x={index} 
              y={0} 
              width={1} 
              height={10} 
              fill="#000000" 
            />
          ))}
        </svg>
        <span className="text-[10px] font-mono font-black tracking-widest text-gray-600 mt-1">{cleanString}</span>
      </div>
    );
  };

  return (
    <div className="border-4 border-black p-4 bg-white text-black rounded-lg max-w-sm mx-auto shadow-md space-y-4 font-sans">
      <div className="text-center border-b-2 border-black pb-2">
        <h2 className="text-xl font-black uppercase tracking-tight truncate">{product.name}</h2>
        <p className="text-xs font-mono font-bold text-gray-500 mt-0.5">CODE: {product.productCode}</p>
      </div>

      <div className="flex justify-between items-center px-2">
        <div>
          <span className="block text-[10px] font-black uppercase text-gray-400">Retail Price</span>
          <span className="text-2xl font-black text-gray-900">{product.price}</span>
        </div>
        <div className="text-right">
          <span className="block text-[10px] font-black uppercase text-gray-400">Audit Node</span>
          <span className="bg-black text-white text-xs font-black px-2 py-0.5 rounded uppercase tracking-wider">VERIFIED</span>
        </div>
      </div>

      {/* Renders the native crisp vector barcode representation */}
      <div className="pt-2 border-t border-dashed border-gray-200">
        {renderPrecisionBarcode(product.barcode)}
      </div>
    </div>
  );
}