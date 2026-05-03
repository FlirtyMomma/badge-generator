import Barcode from 'react-barcode';

const Badge = ({ name, position, code }) => {
  return (
    <div className="w-[85mm] h-[55mm] border border-gray-400 bg-white p-4 flex flex-col items-center justify-between text-black break-inside-avoid">
      <div className="text-center">
        <h2 className="text-2xl font-bold leading-tight">{name}</h2>
        <p className="text-md text-gray-600 font-medium tracking-wide">{position}</p>
      </div>
      
      <div className="flex flex-col items-center">
        <Barcode 
          value={code} 
          format="CODE128" 
          width={1.2} 
          height={40} 
          displayValue={false} 
          margin={0}
        />
        <span className="text-xs mt-1 font-mono">{code}</span>
      </div>
    </div>
  );
};

export default Badge;