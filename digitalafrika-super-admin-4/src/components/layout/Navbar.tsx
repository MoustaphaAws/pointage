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
    <header className="bg-stone-900 text-stone-300 w-full fixed top-0 left-0 z-50 border-b border-stone-800">
      <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center">
        <div className="flex-shrink-0 min-w-[200px] max-w-[280px]">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-stone-700 border border-stone-600 flex items-center justify-center text-xs font-bold text-stone-100 uppercase tracking-wide shrink-0">
              {brandName.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-semibold text-base truncate leading-tight group-hover:text-stone-100 transition">
                {brandName}
              </h1>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider truncate">
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
                  'flex items-center gap-2 px-4 py-2 text-[13px] font-medium transition-all rounded-lg hover:text-white hover:bg-stone-800',
                  isActive ? 'text-stone-100 bg-stone-800' : 'text-stone-400'
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
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-stone-800 transition-colors border border-transparent hover:border-stone-700"
            >
              <div className="w-8 h-8 rounded-lg bg-stone-700 flex items-center justify-center text-xs font-bold text-stone-200 uppercase">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs text-white font-medium truncate leading-none">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[10px] text-stone-500 mt-1">{user?.email}</p>
              </div>
              <ChevronDown
                size={14}
                className={cn('text-stone-500 transition-transform', isUserMenuOpen && 'rotate-180')}
              />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-stone-900 border border-stone-700 rounded-xl shadow-xl p-2">
                <div className="px-3 py-2 border-b border-stone-800 mb-2">
                  <p className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">
                    Compte
                  </p>
                  <p className="text-xs text-stone-300 truncate mt-1">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-3 px-3 py-2 w-full text-xs font-medium text-stone-400 hover:bg-stone-800 hover:text-stone-200 transition-colors rounded-lg"
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
