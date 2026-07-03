import { useState, useEffect } from 'react';

export default function PrintManifest({ session, viewSeason, viewPallet }) {
  const [manifestId, setManifestId] = useState('');
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (!viewSeason || !viewPallet) return;

    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStamp = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const cleanSeason = viewSeason.replace(/\s+/g, '').toUpperCase();
    
    // Unique transaction request code
    const uniqueId = `TRF-${cleanSeason}-${dateStamp}-${timeStamp}-${Math.floor(1000 + Math.random() * 9000)}`;
    setManifestId(uniqueId);

    // CRITICAL FIX: Append the unique timestamp to the structural pallet identity key
    const globalPalletKey = `${cleanSeason}-P${viewPallet}-${dateStamp}-${timeStamp}`; 
    const payload = `HUB_TRANSFER:${uniqueId}:${viewSeason}:${viewPallet}:${globalPalletKey}`;
    
    const encodedPayload = encodeURIComponent(payload);
    
    // Increased size and Error Correction Capability (ecc=H) for industrial scanning reliability
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodedPayload}&format=png&ecc=H`);
  }, [viewSeason, viewPallet, session]);

  if (!session) return null;

  const printDate = new Date().toLocaleString('en-GB');

  return (
    <div className="print-only hidden p-8 bg-white text-black min-h-screen font-sans">
      
      {/* Corporate Header */}
      <div className="border-b-4 border-black pb-6 mb-8 flex justify-between items-start">
        <div className="max-w-[60%]">
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Inter-Store Stock Manifest</h1>
          <h2 className="text-xl font-bold text-gray-700 tracking-wide">Allocation Route Batch Document</h2>
          <div className="mt-4 space-y-1 text-sm font-bold text-gray-500">
            <p>ORIGINATING TERMINAL: <span className="text-black">{session.user?.id?.substring(0, 8).toUpperCase() || 'UNKNOWN'}</span></p>
            <p>DOCUMENT GENERATED: <span className="text-black">{printDate}</span></p>
          </div>
        </div>
        
        {/* High-Resolution QR Block */}
        <div className="flex flex-col items-center justify-center text-center border-4 border-black p-3 rounded-2xl bg-white shadow-sm" style={{ width: '220px', minWidth: '220px' }}>
          {qrUrl ? (
            <img 
              src={qrUrl} 
              alt="Transfer QR Manifest Code" 
              className="block"
              style={{ width: '190px', height: '190px', objectFit: 'contain' }} 
            />
          ) : (
            <div style={{ width: '190px', height: '190px' }} className="bg-gray-100 rounded" />
          )}
          <span className="text-[10px] font-mono font-black tracking-widest mt-2 block select-all text-center">{manifestId}</span>
        </div>
      </div>

      {/* Data Payload Section */}
      <div className="border-4 border-black rounded-2xl p-8 mb-8 bg-gray-50 grid grid-cols-2 gap-8">
        <div className="border-r-2 border-dashed border-gray-300 pr-8">
          <span className="text-sm uppercase font-black tracking-widest text-gray-500 block mb-2">Target Season</span>
          <strong className="text-4xl font-black text-black uppercase tracking-tight">{viewSeason}</strong>
        </div>
        <div className="pl-4">
          <span className="text-sm uppercase font-black tracking-widest text-gray-500 block mb-2">Pallet Configuration</span>
          <strong className="text-4xl font-black text-black">Pallet #{viewPallet}</strong>
        </div>
      </div>

      {/* Handling Instructions */}
      <div className="mt-16 border-t-2 border-black pt-6 text-center">
        <h3 className="text-lg font-black uppercase tracking-widest mb-2">Receiving Instructions</h3>
        <p className="text-sm font-bold text-gray-600 max-w-2xl mx-auto leading-relaxed">
          To acknowledge and receive this stock transfer, the destination store must scan the QR code above using the OneBeyond Store Hub Scanner. 
          <br/><br/>
          <span className="text-black uppercase">Warning: This manifest QR code is a single-use token and will automatically self-destruct upon successful scan to prevent duplicate stock ledger entries.</span>
        </p>
      </div>
    </div>
  );
}