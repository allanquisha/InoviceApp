import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: 24, background: 'var(--bg)',
        }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              An unexpected error occurred. Try refreshing the page.
            </p>
            {this.state.error && (
              <pre style={{
                background: 'var(--danger-light)', color: 'var(--danger)',
                padding: '10px 14px', borderRadius: 6, fontSize: 12,
                textAlign: 'left', overflowX: 'auto', marginBottom: 20,
              }}>
                {this.state.error.message}
              </pre>
            )}
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
