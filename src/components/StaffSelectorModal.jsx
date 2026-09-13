import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function StaffSelectorModal({ staffList, onSelectStaff }) {
  const [pinMode, setPinMode] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');
  
  // Camera States
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const html5QrcodeRef = useRef(null);
  const pinModeRef = useRef(null);

  useEffect(() => {
    pinModeRef.current = pinMode;
  }, [pinMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current) {
        try {
          html5QrcodeRef.current.stop().catch(() => {});
        } catch(e) {}
      }
    };
  }, []);

  // When pinMode activates, attempt to auto-start the camera
  useEffect(() => {
    if (pinMode) {
      // Small delay to ensure the div is rendered before starting
      const timer = setTimeout(() => {
        startCamera();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
  }, [pinMode]);

  const startCamera = async () => {
    setCameraError(false);
    
    if (!html5QrcodeRef.current) {
      try {
        html5QrcodeRef.current = new Html5Qrcode("badge-reader");
      } catch (err) {
        console.error("Failed to initialize camera instance:", err);
        setCameraError(true);
        return;
      }
    }

    try {
      await html5QrcodeRef.current.start(
        { facingMode: { exact: "environment" } },
        { fps: 20, qrbox: { width: 260, height: 160 }, aspectRatio: 1.777778 },
        onScanSuccess,
        () => {}
      );
      setIsScanning(true);
    } catch (err) {
      console.warn("Strict environment lock rejected, attempting relaxed browser fallback:", err);
      try {
        await html5QrcodeRef.current.start(
          { facingMode: "environment" },
          { fps: 15, disableFlip: false, qrbox: { width: 260, height: 160 }, aspectRatio: 1.777778 },
          onScanSuccess,
          () => {}
        );
        setIsScanning(true);
      } catch (fallbackErr) {
        console.error("Camera failed entirely:", fallbackErr);
        setCameraError(true);
      }
    }
  };

  const stopCamera = async () => {
    if (html5QrcodeRef.current?.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Failed to stop camera:", err);
      }
    }
  };

  const playSuccessBeep = () => {
    try {
      const audio = new Audio('/beep.mp3');
      audio.play().catch(() => {});
    } catch (e) {}
  };

  const onScanSuccess = (text) => {
    const currentMode = pinModeRef.current;
    if (currentMode && text === currentMode.code) {
      playSuccessBeep();
      stopCamera();
      onSelectStaff(currentMode);
    } else {
      setError('Invalid badge scanned. Does not match.');
      // clear error after 3 secs
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSelect = (person) => {
    if (person.code) {
      setPinMode(person);
      setPinInput('');
      setError('');
    } else {
      onSelectStaff(person);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === pinMode.code) {
      stopCamera();
      onSelectStaff(pinMode);
    } else {
      setError('Incorrect badge code');
      setPinInput('');
    }
  };

  const handleBack = () => {
    stopCamera();
    setPinMode(null);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/90 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]">
        
        <div className="bg-[#004aad] p-6 text-center shrink-0">
          <h2 className="text-xl font-black text-white tracking-widest uppercase mb-1">
            {pinMode ? 'Scan Badge' : 'Who is Scanning?'}
          </h2>
          <p className="text-blue-100 text-xs font-bold">
            {pinMode ? `Verifying access for ${pinMode.name}` : 'Select your profile to continue'}
          </p>
        </div>

        <div className="p-6 overflow-y-auto">
          {!pinMode ? (
            <div className="space-y-3">
              {staffList.length === 0 ? (
                <div className="text-center p-4">
                  <p className="text-sm font-bold text-gray-500 mb-4">No staff badges configured yet.</p>
                  <button 
                    onClick={() => onSelectStaff({ name: 'Store Manager', position: 'Store Manager' })}
                    className="w-full bg-[#004aad] text-white p-4 rounded-xl font-black uppercase text-sm"
                  >
                    Continue as Default Admin
                  </button>
                </div>
              ) : (
                staffList.map(person => (
                  <button
                    key={person.id}
                    onClick={() => handleSelect(person)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl transition-all group"
                  >
                    <div className="text-left">
                      <div className="font-black text-gray-800 text-lg group-hover:text-[#004aad]">{person.name}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{person.position}</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-[#004aad] group-hover:text-white transition-colors">
                      <span className="font-bold text-sm">→</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Camera Scanner View */}
              <div className={`relative bg-black rounded-xl overflow-hidden border border-gray-200 shadow-inner min-h-[200px] flex items-center justify-center ${cameraError ? 'hidden' : ''}`}>
                <div id="badge-reader" className="w-full absolute inset-0"></div>
                {!isScanning && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-20 p-4 text-center">
                    <button onClick={startCamera} className="bg-[#004aad] text-white px-4 py-2 rounded-lg font-black uppercase text-xs shadow-md hover:bg-blue-800">
                      🎥 Start Scanner
                    </button>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-bold text-center border border-red-200">
                  ⚠️ Camera unavailable. Please type your code below.
                </div>
              )}

              <div className="w-full relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center"><span className="bg-white px-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">OR ENTER MANUALLY</span></div>
              </div>

              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <input
                    type="password"
                    autoFocus
                    placeholder="Enter Badge Code"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="w-full text-center text-xl font-black border-2 border-gray-200 rounded-xl p-3 outline-none focus:border-[#004aad]"
                  />
                  {error && <p className="text-red-500 text-[10px] font-bold text-center mt-2 uppercase tracking-wide">{error}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black uppercase text-xs py-3 rounded-xl transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] bg-[#004aad] hover:bg-blue-800 text-white font-black uppercase text-xs py-3 rounded-xl transition-colors shadow-md"
                  >
                    Unlock
                  </button>
                </div>
              </form>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
