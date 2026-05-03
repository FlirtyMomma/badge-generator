import Barcode from 'react-barcode';

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
          <Barcode 
            value={code} 
            format="CODE128" 
            width={1.4}  
            height={40}  
            displayValue={false} 
            margin={0}
            background="transparent"
          />
        </div>
      </div>
    </div>
  );
};

export default Badge;