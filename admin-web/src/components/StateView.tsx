import React from 'react';
import { UiState } from '../types';

interface StateViewProps {
  state: UiState;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDesc?: string;
  children: React.ReactNode;
}

export const StateView: React.FC<StateViewProps> = ({
  state,
  onRetry,
  emptyTitle = 'No data available',
  emptyDesc = 'There are no records matching the selected parameters.',
  children,
}) => {
  if (state === 'loading') {
    return (
      <div className="state-container">
        <div style={{ width: '100%', maxWidth: '600px' }}>
          <div className="skeleton-row" style={{ height: '32px', width: '45%' }}></div>
          <div className="skeleton-row" style={{ height: '24px', width: '80%' }}></div>
          <div className="skeleton-row" style={{ height: '24px', width: '65%' }}></div>
          <div className="skeleton-row" style={{ height: '24px', width: '90%' }}></div>
        </div>
        <p className="state-desc" style={{ marginTop: '16px' }}>Fetching records from backend...</p>
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div className="state-container">
        <div className="state-icon">--</div>
        <h3 className="state-title">{emptyTitle}</h3>
        <p className="state-desc">{emptyDesc}</p>
        {onRetry && (
          <button className="btn btn-outline" onClick={onRetry}>
            Reset Filters
          </button>
        )}
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="state-container">
        <div className="state-icon" style={{ color: 'var(--color-alert)' }}>!</div>
        <h3 className="state-title">Failed to load data</h3>
        <p className="state-desc">
          An error occurred while connecting to the REST backend server. Please verify network connectivity.
        </p>
        {onRetry && (
          <button className="btn btn-primary" onClick={onRetry}>
            Retry Request
          </button>
        )}
      </div>
    );
  }

  if (state === 'offline') {
    return (
      <div className="state-container">
        <div className="state-icon" style={{ color: 'var(--color-warning)' }}>Offline</div>
        <h3 className="state-title">Operating in Offline Mode</h3>
        <p className="state-desc">
          You are currently disconnected. Changes will be queued locally and reconciled when connectivity returns.
        </p>
        {onRetry && (
          <button className="btn btn-accent" onClick={onRetry}>
            Check Connection
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};
