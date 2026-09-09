import { Link, useLocation } from 'react-router-dom';

export default function Navigation({ isSystemAdmin, session, storeId }) {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Base: Bordered, rounded, and subtle transitions
  const baseBtn = "flex-1 md:flex-none min-w-[90px] flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg transition-all duration-300 uppercase font-black text-[10px] tracking-widest border";
  
  // Active: Deep blue with a subtle "lifted" shadow to create depth
  const activeClass = "bg-[#004aad] text-white border-[#004aad] shadow-md transform scale-[1.02]";
  
  // Inactive: Crisp white background, subtle inner shadow to make them look "pressed" into the bar
  const inactiveClass = "bg-white text-gray-500 border-gray-200 shadow-inner hover:bg-gray-50 hover:border-[#004aad]/30 hover:text-[#004aad]";

  return (
    <div className="flex flex-wrap justify-start md:justify-center bg-gray-50 p-1.5 rounded-xl text-[11px] md:text-xs font-black gap-1.5 shadow-inner border border-gray-200 md:w-fit md:mx-auto">
      
      <Link 
        to="/" 
        className={`${baseBtn} ${currentPath === '/' ? activeClass : inactiveClass}`}
      >
        Price Checker
      </Link>
      
      <Link 
        to="/bay-finder" 
        className={`${baseBtn} ${currentPath === '/bay-finder' ? activeClass : inactiveClass}`}
      >
        Bay Finder
      </Link>
      
      {session && (
        <>
          <Link 
            to="/badges" 
            className={`${baseBtn} ${currentPath === '/badges' ? activeClass : inactiveClass}`}
          >
            Badges
          </Link>

          <Link 
            to="/legacy" 
            className={`${baseBtn} ${currentPath === '/legacy' ? activeClass : inactiveClass}`}
          >
           {storeId || 'Store'} Legacy
          </Link>
          
          <Link 
            to="/stock-take" 
            className={`${baseBtn} ${currentPath === '/stock-take' ? activeClass : inactiveClass}`}
          >
            Stock
          </Link>

          <Link 
            to="/history" 
            className={`${baseBtn} ${currentPath === '/history' ? activeClass : inactiveClass}`}
          >
            Audit Trail
          </Link>
        </>
      )}

      {!session && (
        <Link 
          to="/login" 
          className={`${baseBtn} ${currentPath === '/login' ? activeClass : inactiveClass}`}
        >
          Sign In
        </Link>
      )}
      
      {isSystemAdmin && (
        <>
          <Link 
            to="/admin" 
            className={`${baseBtn} ${currentPath === '/admin' ? activeClass : inactiveClass}`}
          >
            DB Master
          </Link>
          <Link 
            to="/admin/planograms" 
            className={`${baseBtn} ${currentPath === '/admin/planograms' ? activeClass : inactiveClass}`}
          >
            Planograms
          </Link>
        </>
      )}
    </div>
  );
}