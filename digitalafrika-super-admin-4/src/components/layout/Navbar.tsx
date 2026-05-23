import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Settings,
  FileText,
  Database,
  LogOut,
  ChevronDown,
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
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const brandName = user?.companyName?.trim() || 'OnTime';
  const roleLabel = user?.role === 'superadmin' ? 'Super Admin' : 'Administrateur';

  return (
    <header className="text-white w-full fixed top-0 left-0 z-50 border-b border-sky-700" 
      style={{ background: 'linear-gradient(135deg, #0c2d5e 0%, #0b3d7b 30%, #094e8a 60%, #085c96 100%)' }}>
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center">
        <div className="flex-shrink-0 min-w-[200px] max-w-[280px]">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-xs font-bold text-white uppercase tracking-wide shrink-0">
              {brandName.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-base truncate leading-tight group-hover:text-sky-200 transition">
                {brandName}
              </h1>
              <p className="text-[10px] text-sky-200/70 uppercase tracking-wider truncate">
                {roleLabel}
              </p>
            </div>
          </Link>
        </div>

        <nav className="hidden lg:flex flex-1 items-center justify-center gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-[13px] font-medium transition-all rounded-lg hover:text-white hover:bg-white/10',
                  isActive ? 'text-white bg-white/15' : 'text-sky-100/70'
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-shrink-0 min-w-[200px] flex justify-end">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-white/10 transition-colors border border-transparent hover:border-white/20"
            >
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-xs font-bold text-white uppercase">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs text-white font-medium truncate leading-none">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[10px] text-sky-200/70 mt-1">{user?.email}</p>
              </div>
              <ChevronDown
                size={14}
                className={cn('text-sky-200/70 transition-transform', isUserMenuOpen && 'rotate-180')}
              />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl shadow-xl p-2 border border-sky-700" 
                style={{ background: 'linear-gradient(135deg, #0c2d5e 0%, #094e8a 100%)' }}>
                <div className="px-3 py-2 border-b border-sky-700/50 mb-2">
                  <p className="text-[10px] font-medium text-sky-200/50 uppercase tracking-wider">
                    Compte
                  </p>
                  <p className="text-xs text-sky-100 truncate mt-1">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-3 px-3 py-2 w-full text-xs font-medium text-sky-100/70 hover:bg-white/10 hover:text-white transition-colors rounded-lg"
                >
                  <LogOut size={14} />
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