import { useState, useEffect } from 'react';

export default function PrintManifest({ session, viewSeason, viewPallet }) {
  const [manifestId, setManifestId] = useState('');
  const [qrUrl, setQrUrl] = useState('');

    useEffect(() => {
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    // Normalize the season string to strip out spaces
    const cleanSeason = viewSeason.replace(/\s+/g, '').toUpperCase();
    
    // This unique tracking code will look like: TRF-MOTHERSDAY-20260701-3738
    const uniqueId = `TRF-${cleanSeason}-${dateStamp}-${Math.floor(1000 + Math.random() * 9000)}`;
    setManifestId(uniqueId);

    // CRITICAL FIX: The payload now binds the unique combination key so it cannot clash
    const globalPalletKey = `${cleanSeason}-P${viewPallet}`; 
    const payload = `HUB_TRANSFER:${uniqueId}:${viewSeason}:${viewPallet}:${globalPalletKey}`;
    
    const encodedPayload = encodeURIComponent(payload);
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedPayload}&format=svg`);
    }, [viewSeason, viewPallet]);

  if (!qrUrl) return null;

  return (
    <div className="hidden print:block bg-white p-8 text-black w-[210mm] min-h-[297mm] font-sans mx-auto">
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Inter-Store Stock Manifest</h1>
          <p className="text-sm font-bold text-gray-600 mt-1">Allocation Route Batch Document</p>
        </div>
        
        {/* HIGH-CONTRAST VERIFIED REAL SCANNABLE QR VECTOR */}
        <div className="flex flex-col items-center text-center border p-2 rounded-lg bg-white w-36 shadow-sm">
          <img 
            src={qrUrl} 
            alt="Manifest QR Code Locator Link" 
            className="w-32 h-32"
            style={{ aspectRatio: '1 / 1' }}
          />
          <span className="text-[9px] font-mono font-black mt-1 tracking-wider text-gray-700">{manifestId}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-gray-50 p-4 border rounded-lg">
        <div>
          <span className="block text-gray-500 font-bold uppercase tracking-wider text-[10px]">Source Target Season</span>
          <strong className="text-sm text-black">{viewSeason}</strong>
        </div>
        <div>
          <span className="block text-gray-500 font-bold uppercase tracking-wider text-[10px]">Pallet Configuration</span>
          <strong className="text-sm text-black">{viewPallet}</strong>
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-dashed border-gray-300 text-center text-xs text-gray-400">
        <p>Scan the manifest QR code using the store manager mobile device application hub to acknowledge and receive stocks instantly.</p>
      </div>
    </div>
  );
}