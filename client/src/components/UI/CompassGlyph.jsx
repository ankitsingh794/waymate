import React from 'react';

/**
 * CompassGlyph — WayMate brand identity mark (Rule 4)
 *
 * The compass needle is the product's recurring identity element.
 * Used for: loading states, nav active indicator, location fields,
 *           route endpoints, empty trip states, Travel Brief header.
 *
 * Props:
 *   size    — CSS length string, default "1em" (scales with font-size)
 *   color   — CSS color, default "currentColor"
 *   spin    — boolean, adds compass-spin class (for loading states only)
 *   className — additional classes
 */
export default function CompassGlyph({ size = '1em', color = 'currentColor', spin = false, className = '', ...props }) {
  return (
    <svg
      className={`compass-glyph${spin ? ' compass-glyph--spin' : ''}${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Outer ring */}
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" />
      {/* Cardinal tick marks */}
      <line x1="12" y1="2"  x2="12" y2="4.5"  stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="19.5" x2="12" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2"  y1="12" x2="4.5"  y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19.5" y1="12" x2="22" y2="12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Needle — north tip (filled/dark), south tip (light/outline) */}
      <path d="M12 6 L14 12 L12 11 L10 12 Z" fill={color} />
      <path d="M12 18 L14 12 L12 13 L10 12 Z" fill={color} fillOpacity="0.35" />
      {/* Centre pivot */}
      <circle cx="12" cy="12" r="1.2" fill={color} />
    </svg>
  );
}
