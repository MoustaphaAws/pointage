import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, CreditCard, ShieldCheck, 
  AlertTriangle, Settings, FileText, Database, LogOut, ChevronDown 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/useAuthStore';
import { useState } from 'react';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/users', label: 'Utilisateurs', icon: Users },
  { path: '/rh-actions', label: 'Supervision', icon: ShieldCheck },
  { path: '/reports', label: 'Rapports', icon: FileText },
  { path: '/logs', label: 'Audit', icon: Database },
  { path: '/settings', label: 'Paramètres', icon: Settings },
];

export function Navbar() {
  const location = useLocation();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="bg-slate-900 text-slate-300 w-full fixed top-0 left-0 z-50 border-b border-slate-800 shadow-lg">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center">
        {/* Left: Logo */}
        <div className="flex-shrink-0 w-[240px]">
          <Link to="/dashboard" className="flex items-center gap-2">
            <h1 className="text-white font-bold text-xl tracking-tight">On<span className="text-blue-500">Time</span></h1>
            <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[9px] font-bold uppercase tracking-widest rounded border border-blue-500/30">Admin</span>
          </Link>
        </div>

        {/* Center: Navigation */}
        <nav className="hidden lg:flex flex-1 items-center justify-center gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-[13px] font-medium transition-all rounded-lg hover:text-white hover:bg-slate-800",
                  isActive 
                    ? "text-blue-400 bg-slate-800" 
                    : "text-slate-400"
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: User profile & Logout */}
        <div className="flex-shrink-0 w-[240px] flex justify-end">
          <div className="relative">
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold text-white uppercase italic shadow-lg shadow-blue-900/20">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs text-white font-semibold truncate leading-none">{user?.firstName} {user?.lastName}</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tight">Super Admin</p>
              </div>
              <ChevronDown size={14} className={cn("text-slate-500 transition-transform", isUserMenuOpen && "rotate-180")} />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in duration-100">
                <div className="px-3 py-2 border-b border-slate-800 mb-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Compte</p>
                  <p className="text-xs text-slate-300 truncate mt-1">{user?.email}</p>
                </div>
                <button 
                  onClick={logout}
                  className="flex items-center gap-3 px-3 py-2 w-full text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors rounded-lg group"
                >
                  <LogOut size={14} className="group-hover:translate-x-1 transition-transform" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
