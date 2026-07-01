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
import TransferHistory from './components/TransferHistory';

function App() {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('onebeyond_active_tab') || 'priceCheck';
    return (saved === 'login') ? 'priceCheck' : saved;
  });
  
  const [scannedProduct, setScannedProduct] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [activeZoomBarcode, setActiveZoomBarcode] = useState(null);
  const contentRef = useRef(null);

  const [session, setSession] = useState(null);
  // NEW: Add a loading state so the app doesn't panic before Supabase connects
  const [isAuthLoading, setIsAuthLoading] = useState(true); 
  const [storeId, setStoreId] = useState('');
  const [isSystemAdmin, setIsSystemAdmin] = useState(false); 
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activePrintSeason, setActivePrintSeason] = useState('Mothers Day');
  const [activePrintPallet, setActivePrintPallet] = useState('All');

  const [staff, setStaff] = useState(() => {
    const saved = localStorage.getItem('onebeyond_staff_list');
    return saved ? JSON.parse(saved) : [];
  });
  const [form, setForm] = useState({ name: '', position: '', code: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    localStorage.setItem('onebeyond_staff_list', JSON.stringify(staff));
  }, [staff]);

  const [savedProducts, setSavedProducts] = useState(() => {
    return JSON.parse(localStorage.getItem('onebeyond_saved_products')) || [];
  });

  // UPDATED: Only boot the user to the scanner IF auth has completely finished loading
  useEffect(() => {
    if (!isAuthLoading && !session && ['badges', 'legacy', 'stockTake', 'history', 'admin'].includes(mode)) {
      setMode('priceCheck');
    }
  }, [session, mode, isAuthLoading]);

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
    setMode('priceCheck'); 
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

  // UPDATED: Tell the app when Supabase has finished its initial check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) fetchStoreProfile(currentSession.user.id);
      setIsAuthLoading(false); // Connection check complete
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession) {
        fetchStoreProfile(currentSession.user.id);
      } else {
        setStoreId('');
        setIsSystemAdmin(false);
      }
      setIsAuthLoading(false); // State updated
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
      setMode('legacy'); 
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

  const isDataDenseView = mode === 'admin' || mode === 'stockTake' || mode === 'history';

  // Optional: Prevent the screen from flashing empty boxes while Supabase checks the session
  if (isAuthLoading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center font-bold text-gray-400">Loading Terminal...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex flex-col items-center justify-start">
      
      {session && storeId && (
        <div className="w-full max-w-7xl flex justify-end mb-2 text-[11px] text-gray-500 px-2 font-bold items-center gap-2 no-print">
          <span>🏪 Connected: <strong>{storeId}</strong> {isSystemAdmin && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide">Admin Mode</span>}</span>
          <button onClick={handleManualLogoutClick} className="text-red-600 underline hover:text-red-800">Log Out</button>
        </div>
      )}

      {/* 1. GLOBAL HEADER CARD - NEVER MOVES */}
      <div className="w-full max-w-7xl bg-[#004aad] p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-6 no-print">
        <h1 className="text-2xl font-bold mb-4 text-gray-800 text-center tracking-tight">
          

        {/* Header */}
        <div className="bg-[#004aad] text-white pt-2 pb-3 px-4 text-center">
          <div className="flex justify-center items-center">
            <span className="text-[40px] font-black tracking-tighter text-[#ffcb05]">One</span>
            <span className="text-[40px] font-black tracking-tighter text-white">Beyond Store Hub</span>
            
          </div>
        </div>


        </h1>
        <Navigation mode={mode} setMode={setMode} isSystemAdmin={isSystemAdmin} session={session} storeId={storeId} />
      </div>

      {/* 2. DYNAMIC CONTENT AREA */}
      <div className={`w-full transition-all duration-300 ${
        isDataDenseView 
          ? 'max-w-7xl grid grid-cols-1 gap-6' 
          : 'max-w-md xl:max-w-7xl xl:grid xl:grid-cols-[400px_1fr] xl:gap-8 items-start' 
      }`}>
        
        {/* Left/Main Column Form View */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 no-print w-full mb-6 xl:mb-0">
          {mode === 'login' && !session && (
            <form onSubmit={handleStoreLogin} className="space-y-3 py-4 text-center max-w-sm mx-auto">
              <h3 className="text-xs font-black uppercase text-gray-600 tracking-wider">Store Login Authentication</h3>
              <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} className="w-full border p-3 rounded-lg text-sm outline-none text-gray-800" placeholder="coalville.155@onebeyond.co.uk" required />
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full border p-3 rounded-lg text-sm outline-none text-gray-800" placeholder="Store Password" required />
              <button type="submit" disabled={isLoggingIn} className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-lg text-xs font-black uppercase tracking-wider shadow-md">Sign In</button>
            </form>
          )}

          {mode === 'badges' && session && (
            <BadgeBuilder 
              contentRef={contentRef} 
              layoutMode="leftColumn" 
              staff={staff} 
              setStaff={setStaff} 
              form={form} 
              setForm={setForm} 
              editingId={editingId} 
              setEditingId={setEditingId} 
            />
          )}

          {mode === 'priceCheck' && (
            <ScanPanel 
              mode={mode} 
              lookUpProduct={lookUpProduct} 
              scannedProduct={scannedProduct} 
              setScannedProduct={setScannedProduct} 
              setActiveZoomBarcode={setActiveZoomBarcode} 
              savedProducts={savedProducts} 
              setSavedProducts={setSavedProducts}
              session={session} 
              storeId={storeId} 
            />
          )}
          
          {mode === 'legacy' && session && (
            <LegacyStoreCount mode={mode} session={session} lookUpProduct={lookUpProduct} scannedProduct={scannedProduct} setScannedProduct={setScannedProduct} setActivePrintSeason={setActivePrintSeason} setActivePrintPallet={setActivePrintPallet} />
          )}
          
          {mode === 'stockTake' && session && <StoreStockTakeList session={session} />}
          
          {mode === 'admin' && session && <DbMaster isParsing={isParsing} setIsParsing={setIsParsing} isSystemAdmin={isSystemAdmin} />}
          
          {mode === 'history' && session && <TransferHistory storeId={storeId} isSystemAdmin={isSystemAdmin} />}
        </div>

        {/* Right Side Column (Previews & Layouts) */}
        {!isDataDenseView && (
          <div className="hidden xl:block w-full no-print">
            {mode === 'badges' && session && (
              <BadgeBuilder 
                contentRef={contentRef} 
                layoutMode="rightColumn" 
                staff={staff} 
                setStaff={setStaff} 
                form={form} 
                setForm={setForm} 
                editingId={editingId} 
                setEditingId={setEditingId} 
              />
            )}
            {mode === 'priceCheck' && <SavedBatchList savedProducts={savedProducts} setSavedProducts={setSavedProducts} setActiveZoomBarcode={setActiveZoomBarcode} />}
            {mode === 'legacy' && session && (isSystemAdmin ? <AdminLegacyDashboard /> : <div className="bg-white p-8 rounded-xl border text-center text-gray-400 min-h-[500px] flex flex-col justify-center items-center">📦 Vault Audit Live</div>)}
          </div>
        )}

      </div>

      <BarcodeLightbox activeZoomBarcode={activeZoomBarcode} setActiveZoomBarcode={setActiveZoomBarcode} />
      <PrintManifest session={session} viewSeason={activePrintSeason} viewPallet={activePrintPallet} />
    </div>
  );
}

export default App;