import { useState, useRef, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Navigation from './components/Navigation';
import BadgeBuilder from './components/BadgeBuilder';
import ScanPanel from './components/ScanPanel';
import SavedBatchList from './components/SavedBatchList';
import LegacyStoreCount from './components/LegacyStoreCount';
import DbMaster from './components/DbMaster';
import BarcodeLightbox from './components/BarcodeLightbox';
import AdminLegacyDashboard from './components/AdminLegacyDashboard';
import StoreStockTakeList from './components/StoreStockTakeList';
import PrintManifest from './components/PrintManifest';

function App() {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('onebeyond_active_tab') || 'badges';
    return (saved === 'legacy' || saved === 'login') ? 'badges' : saved;
  });
  
  const [scannedProduct, setScannedProduct] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [activeZoomBarcode, setActiveZoomBarcode] = useState(null);
  const contentRef = useRef(null);

  const [session, setSession] = useState(null);
  const [storeId, setStoreId] = useState('');
  const [isSystemAdmin, setIsSystemAdmin] = useState(false); 
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Shared print state pipeline trackers
  const [activePrintSeason, setActivePrintSeason] = useState('Mothers Day');
  const [activePrintPallet, setActivePrintPallet] = useState('All');

  const [savedProducts, setSavedProducts] = useState(() => {
    return JSON.parse(localStorage.getItem('onebeyond_saved_products')) || [];
  });

  const handleLogoutStore = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Session already cleared on server:", err);
    }
    setSession(null);
    setStoreId('');
    setIsSystemAdmin(false);
    setEmailInput('');
    setPasswordInput('');
    setIsLoggingIn(false);
    setMode('badges'); 
  };

  useEffect(() => {
    if (!session) return; 

    let timeoutId;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; 

    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        handleLogoutStore();
        alert("Security Alert: Your store session has timed out due to inactivity. Please sign in again.");
      }, INACTIVITY_LIMIT);
    };

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    window.addEventListener('mousedown', resetTimeout);
    window.addEventListener('mousemove', resetTimeout);
    window.addEventListener('keypress', resetTimeout);
    window.addEventListener('scroll', resetTimeout);

    resetTimeout();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('mousedown', resetTimeout);
      window.removeEventListener('mousemove', resetTimeout);
      window.removeEventListener('keypress', resetTimeout);
      window.removeEventListener('scroll', resetTimeout);
    };
  }, [session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) fetchStoreProfile(currentSession.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession) {
        fetchStoreProfile(currentSession.user.id);
      } else {
        setStoreId('');
        setIsSystemAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { localStorage.setItem('onebeyond_active_tab', mode); }, [mode]);
  useEffect(() => { localStorage.setItem('onebeyond_saved_products', JSON.stringify(savedProducts)); }, [savedProducts]);

  const fetchStoreProfile = async (userId) => {
    const { data } = await supabase.from('store_profiles').select('store_id, is_admin').eq('id', userId).single();
    if (data) {
      setStoreId(data.store_id);
      setIsSystemAdmin(!!data.is_admin);
      setMode('legacy');
    }
  };

  const handleStoreLogin = async (e) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setIsLoggingIn(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailInput.trim(),
      password: passwordInput,
    });

    if (error) {
      alert(`Login Failed: ${error.message}`);
    } else if (data?.session) {
      setSession(data.session);
      fetchStoreProfile(data.session.user.id);
    }
    setIsLoggingIn(false);
  };

  const handleManualLogoutClick = () => {
    if (window.confirm("Log out of this store instance portal?")) {
      handleLogoutStore();
    }
  };

  const lookUpProduct = async (barcode) => {
    const cleanBarcode = barcode.trim();
    const { data } = await supabase.from('store_products').select('*').eq('barcode', cleanBarcode).single();

    if (data) {
      setScannedProduct({ barcode: data.barcode, name: data.description, productCode: data.product_code || 'N/A', price: data.price });
    } else {
      setScannedProduct({ barcode: cleanBarcode, name: "Product Not Found", productCode: 'N/A', price: "N/A" });
    }
  };

  const isDataDenseView = mode === 'admin' || mode === 'stockTake';

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex flex-col items-center justify-start">
      
      {session && storeId && (
        <div className={`w-full flex justify-end mb-2 text-[11px] text-gray-500 px-2 font-bold items-center gap-2 no-print ${isDataDenseView ? 'max-w-7xl' : 'max-w-md xl:max-w-6xl'}`}>
          <span>🏪 Connected: <strong>{storeId}</strong> {isSystemAdmin && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide">Admin Mode</span>}</span>
          <button onClick={handleManualLogoutClick} className="text-red-600 underline hover:text-red-800">Log Out</button>
        </div>
      )}

      <div className={`w-full transition-all duration-300 ${
        isDataDenseView 
          ? 'max-w-7xl grid grid-cols-1 gap-6' 
          : 'max-w-md xl:max-w-6xl xl:grid xl:grid-cols-[400px_1fr] xl:gap-8 items-start' 
      }`}>
        
        {/* Left Side Column Card */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 no-print w-full mb-6 xl:mb-0">
          <h1 className="text-2xl font-bold mb-4 text-gray-800 text-center uppercase tracking-tight">
            <span className="text-[#004aad]">One</span>Beyond Store Hub
          </h1>
          
          <Navigation mode={mode} setMode={setMode} isSystemAdmin={isSystemAdmin} session={session} storeId={storeId} />

          {/* Secure Login Interceptor Layer */}
          {mode === 'login' && !session && (
            <form onSubmit={handleStoreLogin} className="space-y-3 py-4 text-center max-w-sm mx-auto">
              <h3 className="text-xs font-black uppercase text-gray-600 tracking-wider">Store Login Authentication</h3>
              <p className="text-[11px] text-gray-400">Please provide your admin-allocated store credentials.</p>
              <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} className="w-full border p-3 rounded-lg text-sm outline-none text-gray-800" placeholder="store01@onebeyond.com" required />
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full border p-3 rounded-lg text-sm outline-none text-gray-800" placeholder="Store Password" required />
              <button type="submit" disabled={isLoggingIn} className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-lg text-xs font-black uppercase tracking-wider shadow-md">
                {isLoggingIn ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Core App Module Renders */}
          {mode === 'badges' && <BadgeBuilder contentRef={contentRef} layoutMode="leftColumn" />}
          {mode === 'priceCheck' && (
            <ScanPanel mode={mode} lookUpProduct={lookUpProduct} scannedProduct={scannedProduct} setScannedProduct={setScannedProduct} setActiveZoomBarcode={setActiveZoomBarcode} savedProducts={savedProducts} setSavedProducts={setSavedProducts} />
          )}
          
          {/* FIXED: Passes the active state sync functions safely to the child module layout */}
          {mode === 'legacy' && session && (
            <LegacyStoreCount 
              mode={mode} 
              session={session} 
              lookUpProduct={lookUpProduct} 
              scannedProduct={scannedProduct} 
              setScannedProduct={setScannedProduct}
              setActivePrintSeason={setActivePrintSeason}
              setActivePrintPallet={setActivePrintPallet}
            />
          )}
          
          {mode === 'stockTake' && session && (
            <StoreStockTakeList session={session} />
          )}
          {mode === 'admin' && session && (
            <DbMaster isParsing={isParsing} setIsParsing={setIsParsing} isSystemAdmin={isSystemAdmin} />
          )}
        </div>

        {/* Right Side Column Dashboard Workspace */}
        {!isDataDenseView && (
          <div className="hidden xl:block w-full no-print">
            {mode === 'badges' && <BadgeBuilder contentRef={contentRef} layoutMode="rightColumn" />}
            {mode === 'priceCheck' && (
              <SavedBatchList savedProducts={savedProducts} setSavedProducts={setSavedProducts} setActiveZoomBarcode={setActiveZoomBarcode} />
            )}
            {mode === 'legacy' && session && (
              isSystemAdmin ? (
                <AdminLegacyDashboard />
              ) : (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center text-gray-400 min-h-[500px] flex flex-col justify-center items-center">
                  <span className="text-4xl mb-2">📦</span>
                  <h3 className="text-sm font-black uppercase text-gray-700 tracking-wide">Legacy Vault Audit Mode</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">Active logging configuration and cloud sync systems are live in your primary viewport on the left panel.</p>
                </div>
              )
            )}
            {mode === 'login' && !session && (
              <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center text-gray-400 min-h-[500px] flex flex-col justify-center items-center">
                <span className="text-4xl mb-2">🔒</span>
                <h3 className="text-sm font-black uppercase text-gray-700 tracking-wide">Secure Storage Gateway</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">Authenticate your location account on the left console panel to clear cloud database pipeline routing access restrictions.</p>
              </div>
            )}
          </div>
        )}

      </div>

      <BarcodeLightbox activeZoomBarcode={activeZoomBarcode} setActiveZoomBarcode={setActiveZoomBarcode} />
      
      {/* FIXED PRINT ROUTING MANIFEST CARD: Mounted cleanly at document root level */}
      <PrintManifest 
        session={session} 
        viewSeason={activePrintSeason} 
        viewPallet={activePrintPallet} 
      />
    </div>
  );
}

export default App;