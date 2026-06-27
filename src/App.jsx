import { useState, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Html5Qrcode } from 'html5-qrcode'; // Switched to the clean, UI-free engine
import { supabase } from './supabaseClient';
import Badge from './components/Badge';

function App() {
  const [mode, setMode] = useState('badges');

  // --- STAFF BADGES STATE ---
  const [staff, setStaff] = useState(() => {
    const saved = localStorage.getItem('onebeyond_staff_list');
    return saved ? JSON.parse(saved) : [];
  });
  const [form, setForm] = useState({ name: '', position: '', code: '' });
  const [editingId, setEditingId] = useState(null);
  const contentRef = useRef(null);

  // --- LIVE PRICE CHECKER STATE ---
  const [scannedProduct, setScannedProduct] = useState(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  
  const [isScanning, setIsScanning] = useState(false); // Tracks if active camera is running
  const [uiPaused, setUiPaused] = useState(false); 
  const html5QrcodeRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('onebeyond_staff_list', JSON.stringify(staff));
  }, [staff]);

// ENGINE CAMERA WORKFLOW MANAGER
  const startCamera = async () => {
    try {
      if (!html5QrcodeRef.current) {
        html5QrcodeRef.current = new Html5Qrcode("reader");
      }
      
      if (html5QrcodeRef.current.isScanning) return;

      await html5QrcodeRef.current.start(
        // FIXED FOR iPHONE: Switched from 'exact' to 'ideal' to trigger the high-focus primary lens array
        { facingMode: "environment" }, 
        {
          fps: 15, // Bumped slightly for crisper decoding frames
          qrbox: { width: 260, height: 160 }
        },
        (text) => {
          stopCamera();
          setUiPaused(true);
          lookUpProduct(text);
        },
        () => {} 
      );
      setIsScanning(true);
    } catch (err) {
      console.error("Camera failed to start:", err);
    }
  };

  const stopCamera = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Camera failed to stop safely:", err);
      }
    }
  };

  // Switch camera on/off depending on the active tab
  useEffect(() => {
    if (mode === 'priceCheck' && !uiPaused) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [mode, uiPaused]);

  // LIVE CLOUD PRODUCT LOOKUP
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

  // ADMIN SYSTEM BROADCAST
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const productArray = [];

      lines.forEach((line, index) => {
        if (index === 0) return;
        const columns = line.split(/[,\t]/);
        if (columns.length >= 2) {
          const barcode = columns[0]?.trim();
          const name = columns[1]?.trim();
          const productCode = columns[2]?.trim() || ''; 
          const price = columns[3] ? `£${parseFloat(columns[3].trim()).toFixed(2)}` : "£0.00";

          if (barcode && name) {
            productArray.push({ barcode, description: name, product_code: productCode, price });
          }
        }
      });

      try {
        await supabase.from('store_products').delete().neq('barcode', '0');
        const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
        const batches = chunkArray(productArray, 200);

        for (const batch of batches) {
          await supabase.from('store_products').insert(batch);
        }
        alert(`Successfully uploaded ${productArray.length} products to the master live database!`);
      } catch (err) {
        console.error(err);
        alert("Upload error.");
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleVerifyPassword = (e) => {
    e.preventDefault();
    if (adminPassword === "ONEBEYOND2026") { 
      setIsAdminAuthenticated(true);
    } else {
      alert("Incorrect admin password.");
    }
  };

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: "OneBeyond_Staff_Badges_Sheet",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.code) return;

    if (editingId) {
      setStaff(staff.map(s => s.id === editingId ? { ...form, id: editingId } : s));
      setEditingId(null);
    } else {
      setStaff([...staff, { ...form, id: Date.now() }]);
    }
    setForm({ name: '', position: '', code: '' });
  };

  const startEdit = (person) => {
    setEditingId(person.id);
    setForm({ name: person.name, position: person.position, code: person.code });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-lg mb-10 border border-gray-200 no-print">
        <h1 className="text-2xl font-bold mb-4 text-gray-800 text-center uppercase tracking-tight">
          <span className="text-[#004aad]">One</span>Beyond Store Hub
        </h1>
        
        <div className="flex bg-gray-100 p-1 rounded-lg mb-4 text-xs font-bold text-gray-500">
          <button onClick={() => setMode('badges')} className={`flex-1 py-1.5 rounded-md ${mode === 'badges' && 'bg-white text-gray-900 shadow-sm'}`}>Tag Builder</button>
          <button onClick={() => setMode('priceCheck')} className={`flex-1 py-1.5 rounded-md ${mode === 'priceCheck' && 'bg-white text-gray-900 shadow-sm'}`}>Scan Panel</button>
          <button onClick={() => setMode('admin')} className={`flex-1 py-1.5 rounded-md ${mode === 'admin' && 'bg-white text-gray-900 shadow-sm'}`}>DB Master</button>
        </div>

        {/* VIEW A: NAME TAG BUILDER */}
        {mode === 'badges' && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input className="w-full border p-3 rounded-lg text-sm outline-none focus:border-blue-500" placeholder="Staff Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <input className="w-full border p-3 rounded-lg text-sm outline-none focus:border-blue-500" placeholder="Position (e.g. Store Manager)" value={form.position} onChange={e => setForm({...form, position: e.target.value})} />
            <input className="w-full border p-3 rounded-lg text-sm font-mono outline-none focus:border-blue-500" placeholder="Till Access Code" value={form.code} onChange={e => setForm({...form, code: e.target.value})} />
            <button type="submit" className={`w-full text-white py-3 rounded-lg font-bold shadow-md transition-all ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#004aad] hover:bg-blue-800'}`}>
              {editingId ? 'Update Badge Configuration' : 'Add to Printable Sheet'}
            </button>
            {staff.length > 0 && (
              <button onClick={() => handlePrint()} type="button" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold mt-2 shadow-md">
                🖨️ Open Print Options Menu
              </button>
            )}
          </form>
        )}

        {/* VIEW B: SCAN PANEL */}
        {mode === 'priceCheck' && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-xl overflow-hidden border border-gray-200 shadow-inner">
              {/* Clean element without any library UI items */}
              <div id="reader" className="w-full"></div>
              
              {/* Custom Stop Scanning Button */}
              {isScanning && !uiPaused && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                  <button 
                    onClick={() => stopCamera()} 
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide uppercase shadow-md transition-transform active:scale-95"
                  >
                    🛑 Stop Scanning
                  </button>
                </div>
              )}

              {/* Action Prompt - Shows only when camera track is off */}
              {uiPaused && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl backdrop-blur-xs z-20">
                  <button 
                    onClick={() => { 
                      setScannedProduct(null); 
                      setUiPaused(false); // Setting this to false automatically turns the camera back on
                    }} 
                    className="bg-[#004aad] text-white px-6 py-3 rounded-xl font-black uppercase text-sm shadow-xl tracking-wider hover:bg-blue-800 transition-all active:scale-95 border border-white/20"
                  >
                    📷 Scan Next Item
                  </button>
                </div>
              )}

              {/* If camera is stopped completely manually */}
              {!isScanning && !uiPaused && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-xl z-20 p-4 text-center">
                  <button 
                    onClick={() => startCamera()} 
                    className="bg-[#004aad] text-white px-6 py-3 rounded-xl font-black uppercase text-sm shadow-md hover:bg-blue-800"
                  >
                    🎥 Start Scanner
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input type="text" className="flex-grow border px-3 py-2 rounded-lg font-mono text-sm outline-none focus:border-blue-500" placeholder="Scan or Type Barcode" value={manualBarcode} onChange={(e) => setManualBarcode(e.target.value)} />
              <button onClick={() => { lookUpProduct(manualBarcode); setManualBarcode(''); }} className="bg-[#004aad] text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-blue-800">Find</button>
            </div>
            {scannedProduct && (
              <div className={`p-5 rounded-xl border-2 text-center shadow-inner transition-all duration-300 ${scannedProduct.name === "Product Not Found" ? "bg-red-50 border-red-200 text-red-900" : "bg-blue-50 border-blue-200 text-gray-900"}`}>
                <div className="flex justify-between items-center text-[11px] font-mono text-gray-400 mb-2 border-b border-gray-200 pb-1">
                  <span>BC: {scannedProduct.barcode}</span>
                  <span>CODE: {scannedProduct.productCode}</span>
                </div>
                <h3 className="text-lg font-black uppercase leading-tight mb-2">{scannedProduct.name}</h3>
                <p className="text-4xl font-black text-[#004aad]">{scannedProduct.price}</p>
              </div>
            )}
          </div>
        )}

        {/* VIEW C: ADMIN ACCESS */}
        {mode === 'admin' && (
          <div className="space-y-4 text-center">
            {!isAdminAuthenticated ? (
              <form onSubmit={handleVerifyPassword} className="space-y-3">
                <p className="text-xs text-gray-500">Enter master password credentials to override system pricing files.</p>
                <input type="password" className="w-full border p-3 rounded-lg text-center outline-none focus:border-blue-500" placeholder="Master Access Key" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
                <button type="submit" className="w-full bg-gray-800 hover:bg-black text-white py-3 rounded-lg text-sm font-bold shadow-md">Unlock System Portal</button>
              </form>
            ) : (
              <div className="p-4 border-2 border-dashed border-green-300 rounded-xl bg-gray-50 space-y-3">
                <p className="text-xs font-bold text-green-700">🔓 Master Identity Confirmed</p>
                <p className="text-[11px] text-gray-400">Select an updated `AveryProduct_Full.txt` document. All active store scanning portals will sync automatically.</p>
                <input type="file" accept=".txt,.csv" disabled={isParsing} onChange={handleFileUpload} className="text-xs block mx-auto py-2" />
                {isParsing && <p className="text-xs text-blue-600 font-bold animate-pulse">Broadcasting array nodes across store ecosystem...</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* VISUAL PRINT GRID */}
      {mode === 'badges' && (
        <div className="flex justify-start md:justify-center overflow-x-auto pb-20 px-4">
          <div ref={contentRef} className="bg-white shadow-2xl p-[10mm] w-[210mm] min-w-[210mm] min-h-[297mm] grid grid-cols-2 gap-x-4 gap-y-6 content-start">
            {staff.map((person) => (
              <div key={person.id} className="relative group flex justify-center w-[85mm] h-[55mm]">
                <Badge {...person} />
                <div className="absolute -top-3 -right-2 flex gap-2 no-print">
                   <button onClick={() => startEdit(person)} className="bg-orange-500 text-white w-8 h-8 rounded-full shadow-md flex items-center justify-center font-bold">✎</button>
                   <button onClick={() => setStaff(staff.filter(s => s.id !== person.id))} className="bg-red-600 text-white w-8 h-8 rounded-full shadow-md flex items-center justify-center font-bold">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;