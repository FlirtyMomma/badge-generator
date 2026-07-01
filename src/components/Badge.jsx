import { useEffect, useRef } from 'react';

const Badge = ({ name, position, code }) => {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (barcodeRef.current && window.JsBarcode) {
      // Remove asterisks from the code before passing it to the generator
      const cleanCode = code.replace(/\*/g, '');
      
      window.JsBarcode(barcodeRef.current, cleanCode, {
        format: "CODE128",
        width: 3,
        height: 50,
        displayValue: false, // Remains hidden
        margin: 0
      });
    }
  }, [code]);

  return (
    <div className="w-[85mm] h-[55mm] border border-gray-400 bg-white flex flex-col shadow-sm self-center text-left relative overflow-hidden">
      {/* Header */}
      <div className="bg-[#004aad] text-white pt-2 pb-3 px-4 text-center">
        <div className="flex justify-center items-center">
          <span className="text-[28px] font-black tracking-tighter text-[#ffcb05]">One</span>
          <span className="text-[28px] font-black tracking-tighter text-white">Beyond</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-grow flex flex-col justify-center items-center px-4">
        <h2 className="text-[24pt] font-black uppercase text-center leading-none text-black tracking-tight w-full">
          {name}
        </h2>
        {position && (
          <p className="text-[12pt] font-extrabold text-[#004aad] uppercase tracking-normal text-center mt-1 leading-tight">
            {position}
          </p>
        )}
      </div>

      {/* Barcode Footer - TEXT REMOVED FOR SECURITY */}
      <div className="flex flex-col items-center justify-center pb-3 w-full">
        <svg ref={barcodeRef} className="max-w-[90%]"></svg>
        {/* The human-readable text line has been removed */}
      </div>
    </div>
  );
};

export default Badge;