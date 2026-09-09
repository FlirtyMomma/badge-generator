import { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from './supabaseClient';
import Navigation from './components/Navigation';
import BarcodeLightbox from './components/BarcodeLightbox';
import PrintManifest from './components/PrintManifest';
import SavedBatchList from './components/SavedBatchList';
import AdminLegacyDashboard from './components/AdminLegacyDashboard';

// Lazy load heavy components
const BadgeBuilder = lazy(() => import('./components/BadgeBuilder'));
const ScanPanel = lazy(() => import('./components/ScanPanel'));
const LegacyStoreCount = lazy(() => import('./components/LegacyStoreCount'));
const DbMaster = lazy(() => import('./components/DbMaster'));
const StoreStockTakeList = lazy(() => import('./components/StoreStockTakeList'));
const TransferHistory = lazy(() => import('./components/TransferHistory'));
const BayFinder = lazy(() => import('./components/BayFinder'));
const AdminPlanogramManager = lazy(() => import('./components/AdminPlanogramManager'));

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [scannedProduct, setScannedProduct] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [activeZoomBarcode, setActiveZoomBarcode] = useState(null);
  const contentRef = useRef(null);

  const [session, setSession] = useState(null);
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

  useEffect(() => { localStorage.setItem('onebeyond_saved_products', JSON.stringify(savedProducts)); }, [savedProducts]);

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
    navigate('/login'); 
  };

  useEffect(() => {
    if (!session) return; 
    let timeoutId;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; 

    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogoutStore();
        toast.error("Security Alert: Your store session has timed out due to inactivity. Please sign in again.");
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
  }, [session, navigate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) fetchStoreProfile(currentSession.user.id);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession) {
        fetchStoreProfile(currentSession.user.id);
      } else {
        setStoreId('');
        setIsSystemAdmin(false);
      }
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
      toast.error(`Login Failed: ${error.message}`);
    } else if (data?.session) {
      setSession(data.session);
      fetchStoreProfile(data.session.user.id);
      navigate('/legacy'); 
    }
    setIsLoggingIn(false);
  };

  const handleManualLogoutClick = () => {
    toast((t) => (
      <div className="flex flex-col gap-3 p-1 text-center">
        <span className="text-sm font-bold text-gray-800">Log out of this store instance portal?</span>
        <div className="flex gap-2 justify-center mt-1">
          <button 
            onClick={() => toast.dismiss(t.id)} 
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              toast.dismiss(t.id);
              handleLogoutStore();
            }} 
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-md transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    ), { 
      duration: Infinity,
      position: 'top-center'
    });
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

  const isDataDenseView = ['/admin', '/admin/planograms', '/stock-take', '/history', '/bay-finder'].includes(location.pathname);

  if (isAuthLoading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center font-bold text-gray-400">Loading Terminal...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex flex-col items-center justify-start">
      <Toaster position="top-center" />
      
      {session && storeId && (
        <div className="w-full max-w-7xl flex justify-end mb-2 text-[11px] text-gray-500 px-2 font-bold items-center gap-2 no-print">
          <span>🏪 Connected: <strong>{storeId}</strong> {isSystemAdmin && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide">Admin Mode</span>}</span>
          <button onClick={handleManualLogoutClick} className="text-red-600 underline hover:text-red-800">Log Out</button>
        </div>
      )}

      {/* GLOBAL HEADER CARD */}
      <div className="w-full max-w-7xl bg-[#004aad] p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-6 no-print">
        <h1 className="text-2xl font-bold mb-4 text-gray-800 text-center tracking-tight">
          <div className="bg-[#004aad] text-white pt-2 pb-3 px-4 text-center">
            <div className="flex justify-center items-center">
              <span className="md:text-[36px] sm:text-[28px] lg:text-[40px] text-[24px] font-black tracking-tighter text-[#ffcb05]">One</span>
              <span className="md:text-[36px] sm:text-[28px] lg:text-[40px] text-[24px] font-black tracking-tighter text-white">Beyond Store Hub</span>
            </div>
          </div>
        </h1>
        <Navigation isSystemAdmin={isSystemAdmin} session={session} storeId={storeId} />
      </div>

      {/* DYNAMIC CONTENT AREA */}
      <div className={`w-full transition-all duration-300 ${
        isDataDenseView 
          ? 'max-w-7xl grid grid-cols-1 gap-6' 
          : 'max-w-md xl:max-w-7xl xl:grid xl:grid-cols-[400px_1fr] xl:gap-8 items-start' 
      }`}>
        
        {/* Left/Main Column Form View */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 no-print w-full mb-6 xl:mb-0 min-h-[400px]">
          <Suspense fallback={<div className="w-full h-full flex justify-center items-center font-bold text-gray-400">Loading Module...</div>}>
            <Routes>
              <Route path="/login" element={
                !session ? (
                  <form onSubmit={handleStoreLogin} className="space-y-3 py-4 text-center max-w-sm mx-auto">
                    <h3 className="text-xs font-black uppercase text-gray-600 tracking-wider">Store Login Authentication</h3>
                    <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} className="w-full border p-3 rounded-lg text-sm outline-none text-gray-800" placeholder="coalville.155@onebeyond.co.uk" required />
                    <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full border p-3 rounded-lg text-sm outline-none text-gray-800" placeholder="Store Password" required />
                    <button type="submit" disabled={isLoggingIn} className="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-lg text-xs font-black uppercase tracking-wider shadow-md">Sign In</button>
                  </form>
                ) : <Navigate to="/" />
              } />

              <Route path="/badges" element={
                session ? (
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
                ) : <Navigate to="/login" />
              } />

              <Route path="/" element={
                <ScanPanel 
                  lookUpProduct={lookUpProduct} 
                  scannedProduct={scannedProduct} 
                  setScannedProduct={setScannedProduct} 
                  setActiveZoomBarcode={setActiveZoomBarcode} 
                  savedProducts={savedProducts} 
                  setSavedProducts={setSavedProducts}
                  session={session} 
                  storeId={storeId} 
                />
              } />
              
              <Route path="/legacy" element={
                session ? (
                  <LegacyStoreCount 
                    session={session} 
                    lookUpProduct={lookUpProduct} 
                    scannedProduct={scannedProduct} 
                    setScannedProduct={setScannedProduct} 
                    setActivePrintSeason={setActivePrintSeason} 
                    setActivePrintPallet={setActivePrintPallet} 
                  />
                ) : <Navigate to="/login" />
              } />
              
              <Route path="/stock-take" element={
                session ? <StoreStockTakeList session={session} /> : <Navigate to="/login" />
              } />
              
              <Route path="/admin" element={
                session && isSystemAdmin ? <DbMaster isParsing={isParsing} setIsParsing={setIsParsing} isSystemAdmin={isSystemAdmin} /> : <Navigate to="/" />
              } />
              
              <Route path="/history" element={
                session ? <TransferHistory storeId={storeId} isSystemAdmin={isSystemAdmin} /> : <Navigate to="/login" />
              } />
              
              <Route path="/bay-finder" element={<BayFinder storeId={storeId} />} />
              <Route path="/admin/planograms" element={
                session && isSystemAdmin ? <AdminPlanogramManager /> : <Navigate to="/" />
              } />
            </Routes>
          </Suspense>
        </div>

        {/* Right Side Column (Previews & Layouts) */}
        {!isDataDenseView && (
          <div className="hidden xl:block w-full no-print">
            <Suspense fallback={<div className="bg-white p-8 rounded-xl border text-center text-gray-400 min-h-[500px] flex justify-center items-center">Loading Preview...</div>}>
              <Routes>
                <Route path="/badges" element={
                  session ? (
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
                  ) : null
                } />
                <Route path="/" element={
                  <SavedBatchList savedProducts={savedProducts} setSavedProducts={setSavedProducts} setActiveZoomBarcode={setActiveZoomBarcode} />
                } />
                <Route path="/bay-finder" element={
                  <SavedBatchList savedProducts={savedProducts} setSavedProducts={setSavedProducts} setActiveZoomBarcode={setActiveZoomBarcode} />
                } />
                <Route path="/legacy" element={
                  session ? (
                    isSystemAdmin ? <AdminLegacyDashboard /> : <div className="bg-white p-8 rounded-xl border text-center text-gray-400 min-h-[500px] flex flex-col justify-center items-center">📦 Vault Audit Live</div>
                  ) : null
                } />
                <Route path="*" element={null} />
              </Routes>
            </Suspense>
          </div>
        )}
      </div>

      <BarcodeLightbox activeZoomBarcode={activeZoomBarcode} setActiveZoomBarcode={setActiveZoomBarcode} />
      <PrintManifest session={session} viewSeason={activePrintSeason} viewPallet={activePrintPallet} />
    </div>
  );
}

export default App;