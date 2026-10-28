import React, { Suspense, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/design-system.css'; // ← must be first: defines all --ds-* tokens
import './index.css';

import App from './App';
import AuthProvider from './context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { ConfirmProvider } from './components/UI';
import './i18n';

// Remove the CSS app-loader that was injected into index.html before React mounted.
// This runs synchronously before the first render so there is no flash.
function removeAppLoader() {
  const loader = document.getElementById('app-loader');
  if (loader) loader.remove();
}

// Minimal route-transition fallback — pure CSS, zero JS weight.
// This is shown by each route's <Suspense> boundary while the lazy chunk downloads.
// The full-page variant lives in App.jsx (PageSkeleton).
function GlobalSuspenseFallback() {
  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        height: '100vh',
        backgroundColor: '#f8f5ee',
      }}
    >
      {/* Compass-ring spinner — matches the brand motif, pure CSS */}
      <div className="app-compass-loader" aria-label="Loading…" role="status">
        <div className="app-compass-loader__outer" />
        <div className="app-compass-loader__inner" />
        <div className="app-compass-loader__needle" />
      </div>
    </div>
  );
}

function Root() {
  useEffect(() => {
    // Remove the static HTML loader injected by index.html once React has mounted
    removeAppLoader();
  }, []);

  return (
    <React.StrictMode>
      <BrowserRouter>
        {/*
          Outer Suspense catches the very first chunk load (AuthProvider, App itself).
          Individual route Suspenses in App.jsx handle per-route loading.
        */}
        <Suspense fallback={<GlobalSuspenseFallback />}>
          <ErrorBoundary>
            <AuthProvider>
              <ConfirmProvider>
                <App />
              </ConfirmProvider>
            </AuthProvider>
          </ErrorBoundary>
        </Suspense>
      </BrowserRouter>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);