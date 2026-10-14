import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined') {
      window.location.hash = '';
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '30px',
            background: '#F8FAFC',
          }}
        >
          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '36px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
              border: '1px solid #E2E8F0',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#FEF2F2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <h2
              style={{
                fontSize: '20px',
                fontWeight: '800',
                color: '#0F172A',
                marginBottom: '8px',
                letterSpacing: '-0.3px',
              }}
            >
              {this.props.fallbackTitle || 'Unable to Load View'}
            </h2>

            <p
              style={{
                fontSize: '13.5px',
                color: '#64748B',
                lineHeight: 1.55,
                marginBottom: '24px',
              }}
            >
              An unexpected error occurred while rendering this section. Your administrative session and records are safe.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#0B2545',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontWeight: '700',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(11, 37, 69, 0.25)',
                }}
              >
                <RefreshCw size={15} />
                <span>Reload View</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#F1F5F9',
                  color: '#334155',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontWeight: '600',
                  fontSize: '13.5px',
                  cursor: 'pointer',
                }}
              >
                <Home size={15} />
                <span>Dashboard Overview</span>
              </button>
            </div>

            {/* Collapsible Error Technical Information */}
            {this.state.error && (
              <div style={{ marginTop: '28px', textAlign: 'left', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: 0,
                  }}
                >
                  <span>{this.state.showDetails ? 'Hide technical details' : 'Show technical details'}</span>
                  {this.state.showDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {this.state.showDetails && (
                  <pre
                    style={{
                      marginTop: '10px',
                      padding: '12px',
                      background: '#0F172A',
                      color: '#F87171',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      overflowX: 'auto',
                      maxHeight: '180px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
