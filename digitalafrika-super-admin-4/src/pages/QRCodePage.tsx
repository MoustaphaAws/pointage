import { useEffect, useState } from 'react';
import { Sun, Moon, RefreshCw } from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001/api' 
  : 'https://pointage-ufj2.onrender.com/api';

export default function QRCodePage() {
  const [qrData, setQrData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchQRCode = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token') || 
        JSON.parse(localStorage.getItem('ontime-auth') || '{}')?.state?.token;
      const res = await fetch(`${API_BASE}/qrcodes/today`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setQrData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQRCode(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
    </div>
  );

  if (!qrData) return (
    <div className="text-center py-12 text-gray-500">Erreur de chargement</div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Codes du jour</h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date(qrData.date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={fetchQRCode} className="flex items-center gap-2 px-4 py-2 text-sm text-sky-600 hover:bg-sky-50 rounded-xl transition">
          <RefreshCw size={14} /> Régénérer
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Matin */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm text-center hover:shadow-md transition">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Sun size={24} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Pointage du matin</h2>
          <p className="text-sm text-gray-400 mb-4">Entrée • 08:00</p>
          <div className="bg-white rounded-xl p-4 mb-4 border border-gray-100 inline-block">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData.morning.token}`}
              alt="QR Code matin"
              className="w-48 h-48"
            />
          </div>
          <p className="text-[10px] text-gray-300 break-all font-mono">{qrData.morning.token.slice(0, 40)}...</p>
        </div>

        {/* Soir */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm text-center hover:shadow-md transition">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <Moon size={24} className="text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Pointage du soir</h2>
          <p className="text-sm text-gray-400 mb-4">Sortie • 17:00</p>
          <div className="bg-white rounded-xl p-4 mb-4 border border-gray-100 inline-block">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData.evening.token}`}
              alt="QR Code soir"
              className="w-48 h-48"
            />
          </div>
          <p className="text-[10px] text-gray-300 break-all font-mono">{qrData.evening.token.slice(0, 40)}...</p>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center mt-6">
        Les QR codes expirent à minuit. De nouveaux codes sont générés automatiquement chaque jour.
      </p>
    </div>
  );
}
