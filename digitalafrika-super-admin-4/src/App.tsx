import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/Users';
import RHSupervision from './pages/RHSupervision';
import SettingsPage from './pages/Settings';
import AuditLogsPage from './pages/Logs';
import ReportsPage from './pages/Reports';
import EmployeeDetailsPage from './pages/EmployeeDetails';
import Landing from './pages/Landing';
import GestionQRCodes from './components/GestionQRCodes';
import { hasValidStoredToken, useAuthStore } from './store/useAuthStore';


export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  
  const hasToken = hasValidStoredToken();
  
  const canAccess = isAuthenticated && hasToken;
  
  // Récupérer le slug de l'entreprise depuis l'utilisateur connecté
  const entrepriseSlug = user?.companyName?.toLowerCase() || 'default';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />

        <Route
          path="/"
          element={canAccess ? <Navigate to="/dashboard" replace /> : <Landing />}
        />
        
        {/* Route QR Code dynamique par entreprise */}
        <Route
          path="/:entreprise/page/qr-code"
          element={
            canAccess ? (
              <Layout>
                <GestionQRCodes onQrActiveChange={() => {}} />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            canAccess ? (
              <Layout>
                <Dashboard />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        
        <Route
          path="/users"
          element={
            canAccess ? (
              <Layout>
                <UsersPage />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        
        <Route
          path="/users/:id"
          element={
            canAccess ? (
              <Layout>
                <EmployeeDetailsPage />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/rh-actions"
          element={
            canAccess ? (
              <Layout>
                <RHSupervision />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/logs"
          element={
            canAccess ? (
              <Layout>
                <AuditLogsPage />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/reports"
          element={
            canAccess ? (
              <Layout>
                <ReportsPage />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/settings"
          element={
            canAccess ? (
              <Layout>
                <SettingsPage />
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="*"
          element={
            canAccess ? (
              <Layout>
                <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <h3 className="text-lg font-bold font-mono uppercase text-gray-400">Section en cours de déploiement</h3>
                    <p className="text-xs font-mono italic text-gray-300 mt-2">Contrôle Super Admin requis</p>
                  </div>
                </div>
              </Layout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}