import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import './i18n';
const LoadingSpinner = () => (
  <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
    Loading...
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
);
