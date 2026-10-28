/**
 * tokens.js — WayMate Design System (JavaScript mirror)
 *
 * Mirrors the CSS custom properties from styles/design-system.css.
 * Use these in: inline styles, Framer Motion variants, canvas drawing,
 * chart configs, or any JS that can't consume CSS variables directly.
 *
 * ⚠ These values MUST stay in sync with design-system.css.
 * The CSS file is the source of truth — update there first, then here.
 */

// ─── Colour Palette ────────────────────────────────────────────────────────

export const FOREST = {
  50:  '#eef5f2',
  100: '#d4e8df',
  200: '#a9d1bf',
  300: '#7dbaa0',
  400: '#52a380',
  500: '#2a7a5c',
  600: '#226148',
  700: '#1b4d38',
  800: '#143a2a',
  900: '#173328',   // Primary brand colour
  950: '#0e1f18',
};

export const SAND = {
  50:  '#fdf9f4',
  100: '#f8f2e7',
  200: '#f0e3cc',
  300: '#d7bc9c',   // Primary warm accent
  400: '#c9a87e',
  500: '#b89060',
  600: '#9a7448',
  700: '#7c5a34',
};

export const CANVAS  = '#f8f5ee';   // Page background
export const SURFACE = '#ffffff';   // Card / panel background

export const COLORS = {
  // Primary Forest-Sand palette
  forest: FOREST,
  sand: SAND,
  canvas: CANVAS,
  surface: SURFACE,

  // Semantic aliases (use these in component code)
  brand:       FOREST[900],
  brandLight:  FOREST[700],
  accent:      SAND[300],
  accentDark:  SAND[500],

  // Text
  text: {
    primary:   FOREST[900],
    secondary: '#4a5e57',
    tertiary:  '#7a9490',
    inverse:   '#ffffff',
    sand:      SAND[200],
  },

  // Borders
  border:      'rgba(23, 51, 40, 0.08)',
  borderStrong:'rgba(23, 51, 40, 0.18)',
  borderSand:  'rgba(215, 188, 156, 0.3)',

  // Status
  success: '#1a7a52',  successBg: '#edfaf4',
  warning: '#b35c00',  warningBg: '#fff7ed',
  error:   '#c0392b',  errorBg:   '#fef2f2',
  info:    '#1d5fa6',  infoBg:    '#eff6ff',
  amber:   '#d97706',  amberBg:   '#fffbeb',
};

// ─── Typography ────────────────────────────────────────────────────────────

export const TYPOGRAPHY = {
  fontFamily: {
    display: "'Playfair Display', Georgia, 'Times New Roman', serif",
    ui:       "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono:     "'SF Mono', 'Monaco', 'Menlo', 'Courier New', monospace",
  },

  fontSize: {
    xs:   '0.75rem',    // 12px
    sm:   '0.875rem',   // 14px
    base: '1rem',       // 16px
    lg:   '1.125rem',   // 18px
    xl:   '1.25rem',    // 20px
    '2xl':'1.5rem',     // 24px
    '3xl':'1.875rem',   // 30px
    '4xl':'2.25rem',    // 36px
    '5xl':'3rem',       // 48px
    '6xl':'3.75rem',    // 60px
  },

  fontWeight: {
    light:    300,
    regular:  400,
    medium:   500,
    semibold: 600,
    bold:     700,
    black:    900,
  },

  lineHeight: {
    none:    1,
    tight:   1.2,
    snug:    1.375,
    normal:  1.5,
    relaxed: 1.625,
  },

  letterSpacing: {
    tight:   '-0.02em',
    normal:  '0em',
    wide:    '0.04em',
    wider:   '0.08em',  // all-caps labels
    widest:  '0.12em',
  },
};

// ─── Spacing (4px base grid) ───────────────────────────────────────────────

export const SPACING = {
  1:  '0.25rem',    //  4px
  2:  '0.5rem',     //  8px
  3:  '0.75rem',    // 12px
  4:  '1rem',       // 16px
  5:  '1.25rem',    // 20px
  6:  '1.5rem',     // 24px
  8:  '2rem',       // 32px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  32: '8rem',       // 128px
};

// ─── Border radius ─────────────────────────────────────────────────────────

export const RADIUS = {
  sm:   '0.25rem',
  md:   '0.5rem',
  lg:   '0.75rem',
  xl:   '1rem',
  '2xl':'1.5rem',
  '3xl':'2rem',
  full: '9999px',
};

// ─── Shadows ───────────────────────────────────────────────────────────────

export const SHADOWS = {
  1: '0 1px 3px rgba(23, 51, 40, 0.07)',
  2: '0 4px 12px rgba(23, 51, 40, 0.10)',
  3: '0 8px 24px rgba(23, 51, 40, 0.13)',
  4: '0 16px 40px rgba(23, 51, 40, 0.16)',
  glass: '0 8px 32px rgba(23, 51, 40, 0.12), inset 0 1px 0 rgba(255,255,255,0.6)',
};

// ─── Motion Hierarchy (Rule 3) ─────────────────────────────────────────────

export const MOTION = {
  // Easing
  easeOutExpo:  [0.16, 1, 0.3, 1],   // Framer Motion array format
  easeSpring:   [0.22, 1, 0.36, 1],
  easeInOut:    [0.4, 0, 0.2, 1],

  // CSS string format
  ease: {
    outExpo:  'cubic-bezier(0.16, 1, 0.3, 1)',
    spring:   'cubic-bezier(0.22, 1, 0.36, 1)',
    inOut:    'cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // Durations (seconds for Framer Motion, ms for CSS)
  duration: {
    instant:   0.1,    // Tier 3 feedback
    base:      0.3,    // Tier 3 transitions
    slow:      0.5,    // Tier 2 meaningful
    cinematic: 0.76,   // Tier 1 hero reveals
  },

  // Framer Motion variant presets
  variants: {
    // Tier 1 — hero / travel brief / route
    heroReveal: {
      hidden:  { opacity: 0, y: 32 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.76, ease: [0.22, 1, 0.36, 1] } },
    },
    // Tier 2 — page transitions
    pageIn: {
      hidden:  { opacity: 0, y: 12 },
      visible: { opacity: 1, y: 0,  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
    },
    // Tier 2 — tab content
    tabIn: {
      hidden:  { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
    },
    // Tier 2 — drawer slide
    drawerIn: {
      hidden:  { x: '100%', opacity: 0 },
      visible: { x: 0, opacity: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
      exit:    { x: '100%', opacity: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
    },
    // Tier 2 — modal
    modalIn: {
      hidden:  { opacity: 0, scale: 0.96, y: 8 },
      visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
      exit:    { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
    },
    // Tier 3 — staggered itinerary items
    staggerContainer: {
      visible: { transition: { staggerChildren: 0.06 } },
    },
    staggerItem: {
      hidden:  { opacity: 0, y: 8 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
    },
  },
};

// ─── Z-index stack ─────────────────────────────────────────────────────────

export const Z = {
  base:     0,
  raised:   10,
  dropdown: 1000,
  sticky:   1020,
  dock:     1030,
  backdrop: 1040,
  modal:    1050,
  drawer:   1060,
  toast:    1070,
  tooltip:  1080,
  loader:   9999,
};

// ─── Breakpoints ───────────────────────────────────────────────────────────

export const BREAKPOINTS = {
  xs:  '320px',
  sm:  '640px',
  md:  '768px',
  lg:  '1024px',
  xl:  '1280px',
  '2xl': '1536px',
};

// ─── Component dimensions ──────────────────────────────────────────────────

export const SIZES = {
  navbarHeight:   '64px',
  dockHeight:     '72px',
  sidebarWidth:   '280px',
  contentMax:     '1200px',
  contentNarrow:  '720px',
  contentWide:    '1400px',
  btnSm:          '36px',
  btnMd:          '44px',
  btnLg:          '52px',
  inputH:         '44px',
};

// ─── Default export ────────────────────────────────────────────────────────

const THEME = {
  colors:   COLORS,
  typography: TYPOGRAPHY,
  spacing:  SPACING,
  radius:   RADIUS,
  shadows:  SHADOWS,
  motion:   MOTION,
  z:        Z,
  breakpoints: BREAKPOINTS,
  sizes:    SIZES,
};

export default THEME;
