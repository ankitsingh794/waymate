import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import AuthProvider from './context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import './i18n';
import Lottie from 'lottie-react';
import CircleLoader from './assets/circle-loader.json';

const LoadingSpinner = () => (
  <div style={{ display: 'grid', placeItems: 'center', height: '100vh', backgroundColor: '#dedbd2' }}>
    <Lottie animationData={CircleLoader} style={{ width: 150, height: 150 }} />
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <ErrorBoundary>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ErrorBoundary>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
);