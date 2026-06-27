import { useState, useRef, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Navigation from './components/Navigation';
import BadgeBuilder from './components/BadgeBuilder';
import ScanPanel from './components/ScanPanel';
import SavedBatchList from './components/SavedBatchList';
import DbMaster from './components/DbMaster';
import BarcodeLightbox from './components/BarcodeLightbox';

function App() {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('onebeyond_active_tab') || 'badges';
  });

  const [scannedProduct, setScannedProduct] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [activeZoomBarcode, setActiveZoomBarcode] = useState(null);
  const contentRef = useRef(null);

  // Lift batch state up so columns can share it on PC layouts
  const [savedProducts, setSavedProducts] = useState(() => {
    const saved = localStorage.getItem('onebeyond_saved_products');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('onebeyond_active_tab', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('onebeyond_saved_products', JSON.stringify(savedProducts));
  }, [savedProducts]);

  const lookUpProduct = async (barcode) => {
    const cleanBarcode = barcode.trim();
    const { data } = await supabase
      .from('store_products')
      .select('*')
      .eq('barcode', cleanBarcode)
      .single();

    if (data) {
      setScannedProduct({
        barcode: data.barcode,
        name: data.description,
        productCode: data.product_code || 'N/A',
        price: data.price
      });
    } else {
      setScannedProduct({ barcode: cleanBarcode, name: "Product Not Found", productCode: 'N/A', price: "N/A" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex justify-center items-start">
      <div className="w-full max-w-md xl:max-w-6xl xl:grid xl:grid-cols-[400px_1fr] xl:gap-8 items-start">
        
        {/* Left Side Column Card */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 no-print w-full mb-6 xl:mb-0">
          <h1 className="text-2xl font-bold mb-4 text-gray-800 text-center uppercase tracking-tight">
            <span className="text-[#004aad]">One</span>Beyond Store Hub
          </h1>
          
          <Navigation mode={mode} setMode={setMode} />

          {mode === 'badges' && <BadgeBuilder contentRef={contentRef} layoutMode="leftColumn" />}
          
          {mode === 'priceCheck' && (
            <ScanPanel 
              mode={mode} 
              lookUpProduct={lookUpProduct} 
              scannedProduct={scannedProduct} 
              setScannedProduct={setScannedProduct} 
              setActiveZoomBarcode={setActiveZoomBarcode}
              savedProducts={savedProducts}
              setSavedProducts={setSavedProducts}
            />
          )}
          
          {mode === 'admin' && (
            <DbMaster 
              isAdminAuthenticated={isAdminAuthenticated} 
              setIsAdminAuthenticated={setIsAdminAuthenticated} 
              isParsing={isParsing} 
              setIsParsing={setIsParsing} 
            />
          )}
        </div>

        {/* Right Side Column Dashboard Workspace */}
        <div className="hidden xl:block w-full no-print">
          {mode === 'badges' && <BadgeBuilder contentRef={contentRef} layoutMode="rightColumn" />}
          {mode === 'priceCheck' && (
            <SavedBatchList 
              savedProducts={savedProducts}
              setSavedProducts={setSavedProducts}
              setActiveZoomBarcode={setActiveZoomBarcode}
            />
          )}
        </div>

      </div>

      <BarcodeLightbox 
        activeZoomBarcode={activeZoomBarcode} 
        setActiveZoomBarcode={setActiveZoomBarcode} 
      />
    </div>
  );
}

export default App;