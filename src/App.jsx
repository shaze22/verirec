import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore.js';
import { useBillingStore } from './store/billingStore.js';
import { Sidebar } from './components/layout/Sidebar.jsx';

const AuthPage = lazy(() => import('./pages/AuthPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const ProfessionSelectPage = lazy(() => import('./pages/ProfessionSelectPage.jsx'));
const SessionSetupPage = lazy(() => import('./pages/SessionSetupPage.jsx'));
const ConsentPage = lazy(() => import('./pages/ConsentPage.jsx'));
const SessionPage = lazy(() => import('./pages/SessionPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const PricingPage = lazy(() => import('./components/billing/PricingPage.jsx').then(m => ({ default: m.PricingPage })));
const SessionReportPage = lazy(() => import('./pages/SessionReportPage.jsx'));

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();
  const location = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500">Memuatkan...</p>
    </div>
  );
}

function AppInitializer({ children }) {
  const { init, user } = useAuthStore();
  const { fetchSubscription } = useBillingStore();

  useEffect(() => {
    const unsub = init();
    return unsub;
  }, []);

  useEffect(() => {
    if (user) fetchSubscription(user.id);
  }, [user?.id]);

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInitializer>
        <Toaster position="top-right" />
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/dashboard" element={
              <ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>
            } />
            <Route path="/session/new" element={
              <ProtectedRoute><AppLayout><ProfessionSelectPage /></AppLayout></ProtectedRoute>
            } />
            <Route path="/session/setup/:profession" element={
              <ProtectedRoute><AppLayout><SessionSetupPage /></AppLayout></ProtectedRoute>
            } />
            <Route path="/session/consent" element={
              <ProtectedRoute><SessionPage><ConsentPage /></SessionPage></ProtectedRoute>
            } />
            <Route path="/session/active" element={
              <ProtectedRoute><SessionPage /></ProtectedRoute>
            } />
            <Route path="/session/:id" element={
              <ProtectedRoute><AppLayout><SessionReportPage /></AppLayout></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>
            } />
          </Routes>
        </Suspense>
      </AppInitializer>
    </BrowserRouter>
  );
}
