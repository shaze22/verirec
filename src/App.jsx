import { useEffect, useState, Suspense, lazy, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore.js';
import { useBillingStore } from './store/billingStore.js';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { BottomNav } from './components/layout/BottomNav.jsx';
import { OfflineBanner } from './components/ui/OfflineBanner.jsx';
import { CookieConsentBanner } from './components/CookieConsentBanner.jsx';
import { useWindowSize } from './hooks/useWindowSize.js';
import { isCounselorSubdomain } from './lib/subdomain.js';

const AuthPage              = lazy(() => import('./pages/AuthPage.jsx'));
const LandingPage           = lazy(() => import('./pages/LandingPage.jsx'));
const FaqPage               = lazy(() => import('./pages/FaqPage.jsx'));
const DashboardPage         = lazy(() => import('./pages/DashboardPage.jsx'));
const ProfessionSelectPage  = lazy(() => import('./pages/ProfessionSelectPage.jsx'));
const SessionSetupPage      = lazy(() => import('./pages/SessionSetupPage.jsx'));
const ConsentPage           = lazy(() => import('./pages/ConsentPage.jsx'));
const SessionPage           = lazy(() => import('./pages/SessionPage.jsx'));
const SettingsPage          = lazy(() => import('./pages/SettingsPage.jsx'));
const SessionReportPage     = lazy(() => import('./pages/SessionReportPage.jsx'));
const PricingPage           = lazy(() => import('./components/billing/PricingPage.jsx').then(m => ({ default: m.PricingPage })));
const ProfessionLandingPage = lazy(() => import('./pages/ProfessionLandingPage.jsx'));
const AnalyticsPage         = lazy(() => import('./pages/AnalyticsPage.jsx'));
const SubjectsPage          = lazy(() => import('./pages/SubjectsPage.jsx'));
const CasesPage             = lazy(() => import('./pages/CasesPage.jsx'));
const CaseDetailPage        = lazy(() => import('./pages/CaseDetailPage.jsx'));
const AuditLogPage          = lazy(() => import('./pages/AuditLogPage.jsx'));
const TeamPage              = lazy(() => import('./pages/TeamPage.jsx'));
const TermsPage             = lazy(() => import('./pages/TermsPage.jsx'));
const PrivacyPage           = lazy(() => import('./pages/PrivacyPage.jsx'));
const AdminPage             = lazy(() => import('./pages/AdminPage.jsx'));
const AudioLibraryPage      = lazy(() => import('./pages/AudioLibraryPage.jsx'));
const NotFoundPage          = lazy(() => import('./pages/NotFoundPage.jsx'));
const LogoutPage            = lazy(() => import('./pages/LogoutPage.jsx'));
const SharedReportPage      = lazy(() => import('./pages/SharedReportPage.jsx'));
const QuestionTemplatesPage   = lazy(() => import('./pages/QuestionTemplatesPage.jsx'));
const SchedulePage            = lazy(() => import('./pages/SchedulePage.jsx'));
const PublicBookingPage       = lazy(() => import('./pages/PublicBookingPage.jsx'));
const KaunslorSetupPage       = lazy(() => import('./pages/kaunselor/KaunslorSetupPage.jsx'));
const KaunslorAppointmentsPage = lazy(() => import('./pages/kaunselor/KaunslorAppointmentsPage.jsx'));
const KaunslorClientsPage     = lazy(() => import('./pages/kaunselor/KaunslorClientsPage.jsx'));
const KaunslorClientFilePage  = lazy(() => import('./pages/kaunselor/KaunslorClientFilePage.jsx'));
const CounselorLandingPage    = lazy(() => import('./pages/CounselorLandingPage.jsx'));

function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    if (localStorage.getItem('cookie_consent') === 'accepted' && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', { page_path: location.pathname + location.search });
    }
    if (typeof window.Sentry !== 'undefined') {
      window.Sentry.addBreadcrumb({ category: 'navigation', message: location.pathname, level: 'info' });
    }
  }, [location]);
  return null;
}

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
    if (typeof window.__sentryCapture === 'function') window.__sentryCapture(error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
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

function CounselorHome() {
  const { user } = useAuthStore();
  const [dest, setDest] = useState(null);

  useEffect(() => {
    if (!user) return;
    const skipped = localStorage.getItem(`counselor_setup_skipped_${user.id}`);
    if (skipped) { setDest('/analytics'); return; }
    import('./api/counselor.js').then(({ getCounselorProfile }) =>
      getCounselorProfile(user.id)
    ).then(p => {
      setDest(p?.display_name && p?.phone ? '/analytics' : '/kaunselor/setup');
    }).catch(() => setDest('/analytics'));
  }, [user?.id]);

  if (!dest) return <LoadingSpinner />;
  return <Navigate to={dest} replace />;
}

function HomeRoute() {
  const { user, loading } = useAuthStore();
  if (loading) return <LoadingSpinner />;
  if (user) {
    const dest = isCounselorSubdomain() ? '/analytics' : '/dashboard';
    return <Navigate to={dest} replace />;
  }
  if (isCounselorSubdomain()) return <CounselorLandingPage />;
  return <LandingPage />;
}

function AppLayout({ children }) {
  const { isMobile } = useWindowSize();
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className={`flex-1 overflow-auto ${isMobile ? 'pb-16' : ''}`}>{children}</main>
      {isMobile && <BottomNav />}
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
          <PageTracker />
          <OfflineBanner />
          <CookieConsentBanner />
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public — main */}
              <Route path="/"        element={<HomeRoute />} />
              <Route path="/home"    element={<LandingPage />} />
              <Route path="/auth"    element={<AuthPage />} />
              <Route path="/logout"  element={<LogoutPage />} />
              <Route path="/faq"     element={<FaqPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/terms"   element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />

              {/* Public — per-profession landing pages */}
              <Route path="/kaunselor" element={<ProfessionLandingPage professionSlug="counselor" />} />
              <Route path="/polis"     element={<ProfessionLandingPage professionSlug="police" />} />
              <Route path="/sprm"      element={<ProfessionLandingPage professionSlug="sprm" />} />
              <Route path="/doktor"    element={<ProfessionLandingPage professionSlug="doctor" />} />
              <Route path="/iso"       element={<ProfessionLandingPage professionSlug="iso" />} />
              <Route path="/hr"        element={<ProfessionLandingPage professionSlug="hr" />} />
              <Route path="/mahkamah" element={<ProfessionLandingPage professionSlug="court" />} />
              <Route path="/peguam"   element={<ProfessionLandingPage professionSlug="peguam" />} />
              <Route path="/jkm"      element={<ProfessionLandingPage professionSlug="jkm" />} />

              {/* Protected — with sidebar + bottom nav */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  {localStorage.getItem('preferred_profession') === 'counselor'
                    ? <CounselorHome />
                    : <AppLayout><DashboardPage /></AppLayout>}
                </ProtectedRoute>
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
              <Route path="/analytics" element={
                <ProtectedRoute><AppLayout><AnalyticsPage /></AppLayout></ProtectedRoute>
              } />
              <Route path="/subjects" element={
                <ProtectedRoute><AppLayout><SubjectsPage /></AppLayout></ProtectedRoute>
              } />
              <Route path="/cases" element={
                <ProtectedRoute><AppLayout><CasesPage /></AppLayout></ProtectedRoute>
              } />
              <Route path="/cases/:id" element={
                <ProtectedRoute><AppLayout><CaseDetailPage /></AppLayout></ProtectedRoute>
              } />
              <Route path="/audit" element={
                <ProtectedRoute><AppLayout><AuditLogPage /></AppLayout></ProtectedRoute>
              } />
              <Route path="/team" element={
                <ProtectedRoute><AppLayout><TeamPage /></AppLayout></ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute><AppLayout><AdminPage /></AppLayout></ProtectedRoute>
              } />
              <Route path="/library" element={
                <ProtectedRoute><AppLayout><AudioLibraryPage /></AppLayout></ProtectedRoute>
              } />
              <Route path="/templat" element={
                <ProtectedRoute><AppLayout><QuestionTemplatesPage /></AppLayout></ProtectedRoute>
              } />
              <Route path="/jadual" element={
                <ProtectedRoute><AppLayout><SchedulePage /></AppLayout></ProtectedRoute>
              } />

              {/* Public shared report — no auth required */}
              <Route path="/laporan/:token" element={<SharedReportPage />} />

              {/* Public booking — no auth required */}
              <Route path="/book/:code" element={<PublicBookingPage />} />

              {/* Counselor module — protected */}
              <Route path="/kaunselor/setup" element={<ProtectedRoute><KaunslorSetupPage /></ProtectedRoute>} />
              <Route path="/kaunselor/appointments" element={<ProtectedRoute><AppLayout><KaunslorAppointmentsPage /></AppLayout></ProtectedRoute>} />
              <Route path="/kaunselor/clients" element={<ProtectedRoute><AppLayout><KaunslorClientsPage /></AppLayout></ProtectedRoute>} />
              <Route path="/kaunselor/clients/:id" element={<ProtectedRoute><AppLayout><KaunslorClientFilePage /></AppLayout></ProtectedRoute>} />

              {/* Session flow — full screen, no sidebar/nav */}
              <Route path="/session/consent" element={
                <ProtectedRoute><ConsentPage /></ProtectedRoute>
              } />
              <Route path="/session/active" element={
                <ProtectedRoute><SessionPage /></ProtectedRoute>
              } />

              {/* 404 catch-all */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </AppInitializer>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
