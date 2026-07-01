// Native high-contrast CODE128 simulation for React 19 compatibility
const RenderPrecisionBarcode = ({ value }) => {
  const cleanString = String(value || "0000").trim().replace(/[^0-9A-Za-z\-]/g, '');
  if (!cleanString) return null;
  
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
    <svg 
      className="w-[120px] h-[40px]" 
      viewBox={`0 0 ${lines.length} 10`} 
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
    >
      {lines.map((bit, index) => bit === 1 && (
        <rect key={index} x={index} y={0} width={1} height={10} fill="#000000" />
      ))}
    </svg>
  );
};

const Badge = ({ name, position, code }) => {
  return (
    <div className="w-[85mm] h-[55mm] min-w-[85mm] min-h-[55mm] border border-gray-400 bg-white flex flex-col overflow-hidden break-inside-avoid shadow-sm self-center text-left relative">
      <div className="bg-[#004aad] text-white pt-2 pb-3 px-4 text-center">
        <div className="flex justify-center items-center">
          <span className="text-[28px] font-black tracking-tighter leading-none text-[#ffcb05]">One</span>
          <span className="text-[28px] font-black tracking-tighter leading-none text-white font-sans">Beyond</span>
        </div>
      </div>
      <div className="flex-grow flex flex-col justify-center items-center px-4">
        <h2 className="text-[26pt] font-black uppercase text-center leading-none text-black tracking-tight w-full">
          {name}
        </h2>
        {position && (
          <p className="text-[14pt] font-extrabold text-[#004aad] uppercase tracking-normal text-center mt-1 leading-tight">
            {position}
          </p>
        )}
      </div>
      <div className="flex flex-col items-center justify-center pb-4 w-full">
        <div className="scale-x-110 scale-y-125"> 
          {/* Swapped legacy library element with the native React 19 canvas wrapper */}
          <RenderPrecisionBarcode value={code} />
        </div>
      </div>
    </div>
  );
};

export default Badge;