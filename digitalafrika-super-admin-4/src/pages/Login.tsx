import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Button, Card } from '../components/ui/LayoutComponents';
import { Lock, Mail, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { loginSuperAdmin } from '../services/superAdminApi';

export default function Login() {
  const [email, setEmail] = useState('boss@digitalafrika.com');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, logout, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user?.role === 'superadmin') {
      navigate('/dashboard');
    } else if (isAuthenticated && user?.role !== 'superadmin') {
      // Défense en profondeur: on purge la session locale si le rôle est invalide.
      logout();
      toast.error('Accès réservé au SuperAdmin');
    }
  }, [isAuthenticated, user, navigate, logout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await loginSuperAdmin({ email, password });
      login(response.user, response.token);
      toast.success('Connexion SuperAdmin réussie');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Connexion impossible';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract background elements */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      
      <Card className="w-full max-w-md p-8 md:p-10 shadow-2xl relative bg-white/95 backdrop-blur-sm border-slate-200">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 p-3 mb-6 transform -rotate-3">
            <Shield size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">DigitalAfrika</h1>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2">Console Super Administrateur</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block ml-1">Identifiant Administration</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm font-medium"
                placeholder="email@digitalafrika.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block ml-1">Clé de Sécurité</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-sm font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-blue-100"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Chargement...
              </div>
            ) : 'Accéder au Dashboard'}
          </Button>

          <div className="pt-6 border-t border-slate-100">
            <p className="text-[10px] text-center text-slate-400 uppercase font-bold leading-relaxed">
              Système de surveillance active.<br/>
              <span className="text-slate-300">Session restreinte IP : 192.168.1.100</span>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
