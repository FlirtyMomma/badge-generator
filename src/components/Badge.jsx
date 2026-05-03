import Barcode from 'react-barcode';

const Badge = ({ name, position, code }) => {
  return (
    /* 
       Physical dimensions: 85mm x 55mm based on watermarked_img_8285532870250066918.png.
       Fixed units ensure consistency across all store printers.
    */
    <div className="w-[85mm] h-[55mm] min-w-[85mm] min-h-[55mm] border border-gray-400 bg-white flex flex-col overflow-hidden break-inside-avoid shadow-sm self-center text-left relative">
      
      {/* 
          BLUE BRANDING HEADER
          Matches the color and style from image_f02623.png and watermarked_img_8285532870250066918.png.
      */}
      <div className="bg-[#004aad] text-white pt-2 pb-3 px-4 text-center">
        <div className="flex justify-center items-center">
          <span className="text-[28px] font-black tracking-tighter leading-none text-[#ffcb05]">One</span>
          <span className="text-[28px] font-black tracking-tighter leading-none text-white font-sans">Beyond</span>
        </div>
      </div>

      {/* 
          STAFF DETAILS
          Aligned to match the layout in watermarked_img_8285532870250066918.png.
      */}
      <div className="flex-grow flex flex-col justify-center items-center px-4">
        <h2 className="text-[26pt] font-black uppercase text-center leading-none text-black tracking-tight w-full">
          {name}
        </h2>
        
        {position && (
          <p className="text-[14pt] font-extrabold text-[#004aad] uppercase tracking-normal text-center mt-1">
            {position}
          </p>
        )}
      </div>

      {/* 
          BARCODE SECTION
          Secured layout: Barcode is large for scanning, but text code is hidden.
      */}
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