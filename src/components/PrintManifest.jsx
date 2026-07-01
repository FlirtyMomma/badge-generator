import { useState, useEffect } from 'react';

export default function PrintManifest({ session, viewSeason, viewPallet }) {
  const [manifestId, setManifestId] = useState('');
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (!viewSeason || !viewPallet) return;

    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const cleanSeason = viewSeason.replace(/\s+/g, '').toUpperCase();
    
    // Generate the unique transaction signature token code
    const uniqueId = `TRF-${cleanSeason}-${dateStamp}-${Math.floor(1000 + Math.random() * 9000)}`;
    setManifestId(uniqueId);

    // Structural composite unique database container tracking identifier keys
    const globalPalletKey = `${cleanSeason}-P${viewPallet}`; 
    const payload = `HUB_TRANSFER:${uniqueId}:${viewSeason}:${viewPallet}:${globalPalletKey}`;
    
    // Fully encode the payload text string parameter safely
    const encodedPayload = encodeURIComponent(payload);
    
    // CHANGED: Switched output format parameter from &format=svg to &format=png for native printing engine stability
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedPayload}&format=png&ecc=M`);
  }, [viewSeason, viewPallet]);

  if (!session) return null;

  return (
    <div className="print-only hidden p-8 bg-white text-black min-h-screen font-sans">
      <div className="border-b-4 border-black pb-4 mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight mb-1">Inter-Store Stock Manifest</h1>
          <p className="text-sm font-bold text-gray-600 tracking-wide">Allocation Route Batch Document</p>
        </div>
        
        {/* QR Code Container with hardcoded layout dimensions to block flexbox/grid distortion */}
        <div className="flex flex-col items-center justify-start text-center border-2 border-black p-2 rounded-lg bg-white" style={{ width: '170px', minWidth: '170px' }}>
          {qrUrl ? (
            <img 
              src={qrUrl} 
              alt="Transfer QR Manifest Code" 
              className="block"
              style={{ width: '150px', height: '150px', minWidth: '150px', minHeight: '150px', objectFit: 'contain' }} 
            />
          ) : (
            <div style={{ width: '150px', height: '150px' }} className="bg-gray-100 animate-pulse rounded" />
          )}
          <span className="text-[9px] font-mono font-black tracking-tighter mt-1 block select-all text-center">{manifestId}</span>
        </div>
      </div>

      <div className="border-2 border-black rounded-xl p-4 mb-6 bg-gray-50 grid grid-cols-2 gap-4">
        <div>
          <span className="text-[10px] uppercase font-black tracking-wider text-gray-500 block">Source Target Season</span>
          <strong className="text-lg font-bold text-black uppercase">{viewSeason}</strong>
        </div>
        <div>
          <span className="text-[10px] uppercase font-black tracking-wider text-gray-500 block">Pallet Configuration</span>
          <strong className="text-lg font-bold text-black">Pallet {viewPallet}</strong>
        </div>
      </div>

      <div className="mt-12 border-t border-dashed border-gray-300 pt-4 text-center">
        <p className="text-[11px] text-gray-500 max-w-md mx-auto leading-relaxed">
          Scan the manifest QR code using the store manager mobile device application hub to acknowledge and receive stocks instantly.
        </p>
      </div>
    </div>
  );
}