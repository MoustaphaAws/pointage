import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { LogIn, LockKeyhole, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';

export default function QRCodeLoginPage() {
  const { entreprise } = useParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await authService.login(email, password);
      
      // ✅ Vérifier que c'est un superadmin ou admin (RH)
      if (user.role !== 'superadmin' && user.role !== 'admin') {
        setError('Accès réservé au Super Admin et RH. Les employés ne peuvent pas accéder à cette page.');
        setLoading(false);
        return;
      }
      
      // ✅ Stocker directement sans passer par le store global
      localStorage.setItem('auth_token', user.token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      
      // ✅ Redirection directe vers la page QR Code
      window.location.href = `/${entreprise}/page/qr-code`;
    } catch (err: any) {
      setError(err.message || 'Identifiants invalides');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <LockKeyhole className="w-6 h-6 text-blue-700" />
          </div>
          <h2 className="text-sm font-extrabold text-slate-800 uppercase">Pointage {entreprise}</h2>
          <p className="text-[11px] text-slate-500 mt-1">Connexion réservée au Super Admin et RH</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none"
            required
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none"
            required
          />
          
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 p-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-600 font-medium">{error}</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}