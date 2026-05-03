import Barcode from 'react-barcode';

const Badge = ({ name, position, code }) => {
  return (
    /* The outer container set to physical dimensions (85mm x 55mm) */
    <div className="w-[85mm] h-[55mm] border-2 border-black bg-white flex flex-col overflow-hidden break-inside-avoid shadow-sm self-center">
      
      {/* Top Branding Strip */}
      <div className="bg-black text-white py-1.5 px-4 text-center">
        <p className="text-[9px] tracking-[0.3em] font-bold uppercase italic">
          Internal Staff Access
        </p>
      </div>

      {/* Main Staff Info Section */}
      <div className="flex-grow flex flex-col justify-center items-center px-4">
        <h2 className="text-3xl font-black uppercase text-center leading-none text-gray-900 break-words w-full">
          {name}
        </h2>
        
        {/* Decorative line to fill space and look professional */}
        <div className="w-12 h-1 bg-black my-2"></div>
        
        {position ? (
          <p className="text-lg font-bold text-gray-600 uppercase tracking-tighter">
            {position}
          </p>
        ) : (
          /* Empty space maintainer if no position is entered */
          <div className="h-6" />
        )}
      </div>

      {/* Secured Barcode Section */}
      <div className="flex flex-col items-center justify-center py-4 bg-gray-50 border-t border-gray-200 w-full min-h-[24mm]">
        <div className="scale-125"> 
          <Barcode 
            value={code} 
            format="CODE128" 
            width={1.6}  /* Width of the bars */
            height={50}  /* Height of the bars */
            displayValue={false} /* SECURE: This hides the numeric code */
            margin={0}
            background="transparent"
          />
        </div>
        {/* We omitted the <span>{code}</span> here for privacy */}
      </div>
    </div>
  );
};

export default Badge;