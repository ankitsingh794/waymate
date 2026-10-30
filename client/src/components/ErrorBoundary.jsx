import React from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Sanitize logging in production to avoid leaking sensitive data or user tokens in the console
    if (import.meta.env?.DEV) {
      console.warn('[WayMate Safety Boundary] Render error captured:', error?.message);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070c0a] text-[#f4efe6] flex items-center justify-center p-6 select-none">
          <div className="max-w-md w-full bg-[#0d1613] border border-[#23352e] rounded-3xl p-8 shadow-2xl text-center backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#34d399]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#14231d] border border-[#2b443a] flex items-center justify-center text-[#e5a95b] shadow-inner">
              <FiAlertTriangle className="text-2xl" />
            </div>

            <h1 className="font-serif text-2xl font-bold tracking-tight text-[#f4efe6] mb-3">
              Experience Interrupted
            </h1>

            <p className="text-sm text-[#9ab3a6] leading-relaxed mb-8">
              We encountered an unexpected interface condition. Your data remains secure and intact.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#14231d] hover:bg-[#1b2e26] border border-[#2b443a] text-xs font-semibold uppercase tracking-wider text-[#e6f4ed] flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer active:scale-95"
              >
                <FiRefreshCw className="text-sm" />
                Reload View
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#214337] to-[#2d5c4b] hover:from-[#2a5647] hover:to-[#376f5b] text-xs font-semibold uppercase tracking-wider text-[#f4efe6] flex items-center justify-center gap-2 shadow-lg transition-all duration-200 cursor-pointer active:scale-95"
              >
                <FiHome className="text-sm" />
                Return to Base
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
