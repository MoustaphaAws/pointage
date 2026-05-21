import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import UsersPage from './pages/Users';
import RHSupervision from './pages/RHSupervision';
import SettingsPage from './pages/Settings';
import AuditLogsPage from './pages/Logs';
import ReportsPage from './pages/Reports';
import EmployeeDetailsPage from './pages/EmployeeDetails';
import Landing from './pages/Landing';
import { hasValidStoredToken, useAuthStore } from './store/useAuthStore';

export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const canAccess = isAuthenticated && hasValidStoredToken() && user?.role === 'superadmin';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={canAccess ? <Navigate to="/dashboard" replace /> : <Login />} />

        <Route
          path="/"
          element={canAccess ? <Navigate to="/dashboard" replace /> : <Landing />}
        />
        
        <Route
          path="/dashboard"
          element={
            canAccess ? (
              <Layout>
                <Dashboard />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
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
              <Navigate to="/login" replace />
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
              <Navigate to="/login" replace />
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
              <Navigate to="/login" replace />
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
              <Navigate to="/login" replace />
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
              <Navigate to="/login" replace />
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
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Fallback endpoints (to implement if time permits or keep as informative cards) */}
        <Route
          path="*"
          element={
            canAccess ? (
              <Layout>
                <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <h3 className="text-lg font-bold font-mono uppercase text-gray-400">Section en cours de déploiement</h3>
                    <p className="text-xs font-mono italic text-gray-300 mt-2 italic">Contrôle Super Admin requis</p>
                  </div>
                </div>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
// force deploy
