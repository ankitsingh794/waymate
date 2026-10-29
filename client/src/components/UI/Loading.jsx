import React from 'react';
import './Loading.css';

/**
 * Signature Atelier Precision Compass Loader
 *
 * Modern multi-tier luxury loader featuring dual orbital precision rings,
 * pulsing emerald-sand core beacon, and optional editorial label.
 *
 * Props:
 *  - size: 'xs' (18px) | 'sm' (26px) | 'md' (42px) | 'lg' (58px) | 'xl' (76px)
 *  - label: string (e.g. "Connecting to squad channel...")
 *  - sublabel: string (e.g. "Syncing itinerary & live waypoints")
 *  - fullscreen: boolean (covers viewport with frosted dark emerald glass)
 *  - inline: boolean (minimal compact mode for buttons & chips)
 *  - dark: boolean (forces dark luxury palette even on light canvas)
 */
export function Loading({
  size = 'md',
  label,
  sublabel,
  fullscreen = false,
  inline = false,
  dark = false,
  className = '',
  ...props
}) {
  const containerClasses = [
    'wm-loader',
    `wm-loader--${size}`,
    fullscreen && 'wm-loader--fullscreen',
    inline && 'wm-loader--inline',
    dark && 'wm-loader--dark',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={containerClasses}
      role="status"
      aria-live="polite"
      aria-label={label || 'Loading content'}
      {...props}
    >
      <div className="wm-loader__rig" aria-hidden="true">
        {/* Outer orbital gold track */}
        <div className="wm-loader__orbit-outer" />
        {/* Inner reverse emerald gyro */}
        <div className="wm-loader__orbit-inner" />
        {/* Glowing pivot beacon */}
        <div className="wm-loader__pivot" />
      </div>

      {(label || sublabel) && (
        <div className="wm-loader__caption">
          {label && <p className="wm-loader__label">{label}</p>}
          {sublabel && <p className="wm-loader__sublabel">{sublabel}</p>}
        </div>
      )}
    </div>
  );
}

export function LoadingOverlay({
  message = 'Loading...',
  sublabel,
  size = 'lg',
}) {
  return (
    <div className="loading-overlay" role="dialog" aria-modal="true">
      <Loading size={size} label={message} sublabel={sublabel} dark />
    </div>
  );
}

export default Loading;
