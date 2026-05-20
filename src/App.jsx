import { useEffect, Suspense, lazy, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore.js';
import { useBillingStore } from './store/billingStore.js';
import { Sidebar } from './components/layout/Sidebar.jsx';

const AuthPage          = lazy(() => import('./pages/AuthPage.jsx'));
const DashboardPage     = lazy(() => import('./pages/DashboardPage.jsx'));
const ProfessionSelectPage = lazy(() => import('./pages/ProfessionSelectPage.jsx'));
const SessionSetupPage  = lazy(() => import('./pages/SessionSetupPage.jsx'));
const ConsentPage       = lazy(() => import('./pages/ConsentPage.jsx'));
const SessionPage       = lazy(() => import('./pages/SessionPage.jsx'));
const SettingsPage      = lazy(() => import('./pages/SettingsPage.jsx'));
const SessionReportPage = lazy(() => import('./pages/SessionReportPage.jsx'));
const PricingPage       = lazy(() => import('./components/billing/PricingPage.jsx').then(m => ({ default: m.PricingPage })));

// Global error boundary — catches any component crash
class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ralat Tidak Dijangka</h2>
            <p className="text-gray-500 text-sm mb-4">{this.state.error.message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = '/dashboard'; }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Kembali ke Papan Pemuka
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500">Memuatkan...</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();
  const location = useLocation();
  if (loading) return <LoadingSpinner />;
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
      <ErrorBoundary>
        <AppInitializer>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public */}
              <Route path="/auth"    element={<AuthPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/"        element={<Navigate to="/dashboard" replace />} />

              {/* Protected — with sidebar */}
              <Route path="/dashboard" element={
                <ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>
              } />
              <Route path="/session/new" element={
                <ProtectedRoute><AppLayout><ProfessionSelectPage /></AppLayout></ProtectedRoute>
              } />
              <Route path="/session/setup/:profession" element={
                <ProtectedRoute><AppLayout><SessionSetupPage /></AppLayout></ProtectedRoute>
              } />
              <Route path="/session/:id" element={
                <ProtectedRoute><AppLayout><SessionReportPage /></AppLayout></ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>
              } />

              {/* Session flow — full screen, no sidebar */}
              <Route path="/session/consent" element={
                <ProtectedRoute><ConsentPage /></ProtectedRoute>
              } />
              <Route path="/session/active" element={
                <ProtectedRoute><SessionPage /></ProtectedRoute>
              } />
            </Routes>
          </Suspense>
        </AppInitializer>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
