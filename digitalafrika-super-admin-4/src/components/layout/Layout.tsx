import { ReactNode, useEffect } from 'react';
import { Navbar } from './Navbar';
import { Toaster } from 'react-hot-toast';
import { hasValidStoredToken, useAuthStore } from '../../store/useAuthStore';
import { Navigate } from 'react-router-dom';

export function Layout({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const logout = useAuthStore(state => state.logout);

  useEffect(() => {
    if (!hasValidStoredToken()) {
      logout();
    }
  }, [logout]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col pt-16">
        <Toaster position="top-right" />
        <div className="max-w-[1600px] mx-auto w-full p-6 md:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
