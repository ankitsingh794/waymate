/**
 * Loading Spinner Component
 */

import React from 'react';
import './Loading.css';

export function Loading({ size = 'md', fullscreen = false }) {
  const classNames = [
    'loading',
    `loading-${size}`,
    fullscreen && 'loading-fullscreen',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames}>
      <div className="loading-spinner"></div>
    </div>
  );
}

export function LoadingOverlay() {
  return (
    <div className="loading-overlay">
      <div className="loading loading-lg">
        <div className="loading-spinner"></div>
      </div>
    </div>
  );
}

export default Loading;
