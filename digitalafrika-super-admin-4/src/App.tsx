import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import UsersPage from './pages/Users';
import RHSupervision from './pages/RHSupervision';
import SettingsPage from './pages/Settings';
import AuditLogsPage from './pages/Logs';
import ReportsPage from './pages/Reports';
import { hasValidStoredToken, useAuthStore } from './store/useAuthStore';

export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const canAccess = isAuthenticated && hasValidStoredToken();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={canAccess ? <Navigate to="/dashboard" replace /> : <Login />} />
        
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route 
          path="/dashboard" 
          element={
            <Layout>
              <Dashboard />
            </Layout>
          } 
        />
        
        <Route 
          path="/users" 
          element={
            <Layout>
              <UsersPage />
            </Layout>
          } 
        />

        <Route 
          path="/rh-actions" 
          element={
            <Layout>
              <RHSupervision />
            </Layout>
          } 
        />

        <Route 
          path="/logs" 
          element={
            <Layout>
              <AuditLogsPage />
            </Layout>
          } 
        />

        <Route 
          path="/reports" 
          element={
            <Layout>
              <ReportsPage />
            </Layout>
          } 
        />

        <Route 
          path="/settings" 
          element={
            <Layout>
              <SettingsPage />
            </Layout>
          } 
        />

        {/* Fallback endpoints (to implement if time permits or keep as informative cards) */}
        <Route 
          path="*" 
          element={
            <Layout>
              <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <h3 className="text-lg font-bold font-mono uppercase text-gray-400">Section en cours de déploiement</h3>
                  <p className="text-xs font-mono italic text-gray-300 mt-2 italic">Contrôle Super Admin requis</p>
                </div>
              </div>
            </Layout>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
