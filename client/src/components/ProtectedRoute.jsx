import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: 'grid',
          minHeight: '100vh',
          placeItems: 'center',
          backgroundColor: '#0c150e',
          color: '#e4ebd9',
        }}
        aria-busy="true"
        aria-label="Restoring session"
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              border: '2.5px solid rgba(138, 171, 143, 0.2)',
              borderTopColor: '#8aab8f',
              borderRadius: '50%',
              animation: 'btn-spin 0.75s linear infinite',
            }}
          />
          <span style={{ fontSize: '0.85rem', letterSpacing: '0.04em', opacity: 0.75 }}>
            WayMate
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
