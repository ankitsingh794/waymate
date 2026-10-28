import React from 'react';
import './Skeleton.css';

/**
 * Skeleton — shimmer loading placeholder (Phase 2, Rule 3)
 *
 * Usage:
 *   <Skeleton width="100%" height="1.2rem" />
 *   <Skeleton width="2.5rem" height="2.5rem" rounded />
 *   <Skeleton lines={3} />        ← text block shortcut
 */
export default function Skeleton({
  width,
  height = '1rem',
  rounded = false,
  lines,
  gap = '0.5rem',
  className = '',
  style = {},
}) {
  if (lines && lines > 1) {
    return (
      <div className={`sk-block ${className}`} style={{ display: 'grid', gap }} role="status" aria-label="Loading">
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            className="sk-item"
            style={{
              width: i === lines - 1 ? '72%' : '100%',
              height,
            }}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  return (
    <span
      className={`sk-item ${rounded ? 'sk-item--round' : ''} ${className}`}
      style={{ width, height, ...style }}
      role="status"
      aria-label="Loading"
      aria-hidden="true"
    />
  );
}
