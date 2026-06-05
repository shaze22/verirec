import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import './index.css';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';

if (import.meta.env.VITE_SENTRY_DSN) {
  // Load Sentry after initial render to avoid blocking LCP
  requestIdleCallback(() => {
    import('@sentry/react').then(Sentry => {
      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.1,
        replaysOnErrorSampleRate: 0.2,
        replaysSessionSampleRate: 0,
        integrations: [Sentry.browserTracingIntegration()],
      });
      window.__sentryCapture = (error, info) => Sentry.captureException(error, { extra: info });
      window.Sentry = Sentry;
    });
  }, { timeout: 3000 });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>
);
