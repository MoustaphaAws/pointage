import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { LogIn, LockKeyhole, AlertCircle, QrCode, Building2, ArrowRight } from 'lucide-react';
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
      
      if (user.role !== 'superadmin' && user.role !== 'admin') {
        setError('Accès réservé au Super Admin et RH. Les employés ne peuvent pas accéder à cette page.');
        setLoading(false);
        return;
      }
      
      localStorage.setItem('auth_token', user.token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      window.location.href = `/${entreprise}/page/qr-code`;
    } catch (err: any) {
      setError(err.message || 'Identifiants invalides');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Fond décoratif */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Badge entreprise */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-xs font-medium mb-4">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            {entreprise || 'Entreprise'}
          </div>
        </div>

        {/* Carte principale */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          
          {/* En-tête */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-lg shadow-blue-500/25 mb-5">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Pointage par QR Code
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              Connectez-vous pour générer les codes d'émargement de votre équipe
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                Email professionnel
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="rh@entreprise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition bg-slate-50/80 placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-2xl px-4 py-3.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition bg-slate-50/80 placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-100 p-3.5 rounded-2xl animate-fade-in">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 font-medium leading-relaxed">{error}</p>
              </div>
            )}

            {/* Bouton connexion */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Se connecter
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Info bas de carte */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <LockKeyhole className="w-4 h-4 text-blue-600" />
              <span>Connexion sécurisée réservée aux administrateurs</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-white/40 mt-6 font-medium">
          One Time — Système d'émargement
        </p>
      </div>
    </div>
  );
}