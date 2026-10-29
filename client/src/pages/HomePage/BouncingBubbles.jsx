import { useEffect, useRef } from 'react';
import './BouncingBubbles.css';

/* ── Curated travel ambiance bubbles floating in the background ─────────────── */
const BUBBLES_PRESET = [
  {
    id: 'flights',
    emoji: '✈️',
    radius: 64,
    accentGlow: 'rgba(56, 189, 248, 0.35)',
    badgeShape: 'squircle',
    hasRing: true,
    vx: 0.65,
    vy: -0.5,
  },
  {
    id: 'escapes',
    emoji: '🌴',
    radius: 56,
    accentGlow: 'rgba(52, 211, 153, 0.32)',
    badgeShape: 'circle',
    hasRing: false,
    vx: -0.55,
    vy: 0.6,
  },
  {
    id: 'routes',
    emoji: '🗺️',
    radius: 72,
    accentGlow: 'rgba(129, 140, 248, 0.38)',
    badgeShape: 'squircle',
    hasRing: true,
    vx: 0.5,
    vy: 0.65,
  },
  {
    id: 'culinary',
    emoji: '🍜',
    radius: 54,
    accentGlow: 'rgba(251, 146, 60, 0.32)',
    badgeShape: 'squircle',
    hasRing: false,
    vx: -0.7,
    vy: -0.55,
  },
  {
    id: 'stays',
    emoji: '🏨',
    radius: 66,
    accentGlow: 'rgba(192, 132, 252, 0.35)',
    badgeShape: 'circle',
    hasRing: true,
    vx: 0.6,
    vy: -0.65,
  },
  {
    id: 'ai-magic',
    emoji: '✨',
    radius: 68,
    accentGlow: 'rgba(232, 121, 249, 0.38)',
    badgeShape: 'squircle',
    hasRing: true,
    vx: -0.5,
    vy: 0.55,
  },
  {
    id: 'cafes',
    emoji: '☕',
    radius: 52,
    accentGlow: 'rgba(251, 191, 36, 0.3)',
    badgeShape: 'circle',
    hasRing: false,
    vx: 0.68,
    vy: 0.48,
  },
  {
    id: 'adventures',
    emoji: '🎒',
    radius: 50,
    accentGlow: 'rgba(244, 114, 182, 0.3)',
    badgeShape: 'squircle',
    hasRing: false,
    vx: -0.62,
    vy: -0.5,
  },
  {
    id: 'views',
    emoji: '📸',
    radius: 55,
    accentGlow: 'rgba(45, 212, 191, 0.32)',
    badgeShape: 'squircle',
    hasRing: true,
    vx: 0.48,
    vy: -0.6,
  },
  {
    id: 'transit',
    emoji: '🚆',
    radius: 58,
    accentGlow: 'rgba(96, 165, 250, 0.32)',
    badgeShape: 'circle',
    hasRing: false,
    vx: -0.55,
    vy: 0.45,
  },
  {
    id: 'navigation',
    emoji: '🧭',
    radius: 60,
    accentGlow: 'rgba(56, 189, 248, 0.32)',
    badgeShape: 'circle',
    hasRing: true,
    vx: 0.58,
    vy: 0.52,
  },
  {
    id: 'coves',
    emoji: '🏖️',
    radius: 62,
    accentGlow: 'rgba(45, 212, 191, 0.35)',
    badgeShape: 'squircle',
    hasRing: false,
    vx: -0.45,
    vy: -0.58,
  },
];

export default function BouncingBubbles({ className = '' }) {
  const containerRef = useRef(null);
  const bubbleNodesRef = useRef(new Map());

  // Mutable physics simulation state kept in ref to ensure 60/120fps with zero React re-renders
  const simRef = useRef({
    bubbles: [],
    width: 1200,
    height: 700,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Measure initial hero background arena dimensions
    const rect = container.getBoundingClientRect();
    const width = Math.max(320, rect.width || window.innerWidth);
    const height = Math.max(320, rect.height || 600);

    simRef.current.width = width;
    simRef.current.height = height;

    // Distribute initial bubbles across the full hero background space
    const cols = 4;
    const rows = Math.ceil(BUBBLES_PRESET.length / cols);
    const cellW = width / cols;
    const cellH = height / rows;

    simRef.current.bubbles = BUBBLES_PRESET.map((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const pad = item.radius + 16;

      const initX = Math.min(
        width - pad,
        Math.max(pad, col * cellW + cellW * 0.5 + (Math.random() - 0.5) * (cellW * 0.4))
      );
      const initY = Math.min(
        height - pad,
        Math.max(pad, row * cellH + cellH * 0.5 + (Math.random() - 0.5) * (cellH * 0.4))
      );

      return {
        ...item,
        x: initX,
        y: initY,
        vx: item.vx * (0.8 + Math.random() * 0.4),
        vy: item.vy * (0.8 + Math.random() * 0.4),
        mass: item.radius * item.radius,
      };
    });

    // ResizeObserver dynamically adjusts simulation boundaries when the window changes size
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: rw, height: rh } = entry.contentRect;
        if (rw > 0 && rh > 0) {
          simRef.current.width = rw;
          simRef.current.height = rh;
        }
      }
    });
    ro.observe(container);

    // Physics Animation Loop
    let lastTime = performance.now();
    let animId = null;
    const restitution = 0.98; // High elasticity bounce for serene perpetual motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const tick = (now) => {
      const deltaMs = Math.min(32, Math.max(8, now - lastTime));
      let dt = deltaMs / 16.666;
      lastTime = now;

      if (prefersReducedMotion) {
        dt *= 0.2; // Slow graceful drift for reduced motion
      }

      const sim = simRef.current;
      const { width: currentW, height: currentH, bubbles } = sim;

      // Step 1: Update individual positions & wall collisions
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];

        // Horizontal bounce off hero section edges
        if (b.x - b.radius < 0) {
          b.x = b.radius;
          b.vx = Math.abs(b.vx) * restitution;
        } else if (b.x + b.radius > currentW) {
          b.x = currentW - b.radius;
          b.vx = -Math.abs(b.vx) * restitution;
        }

        // Vertical bounce off hero section edges
        if (b.y - b.radius < 0) {
          b.y = b.radius;
          b.vy = Math.abs(b.vy) * restitution;
        } else if (b.y + b.radius > currentH) {
          b.y = currentH - b.radius;
          b.vy = -Math.abs(b.vy) * restitution;
        }

        // Maintain serene, perpetual ambient cruising speed
        const speed = Math.hypot(b.vx, b.vy);
        if (speed < 0.4) {
          const angle = Math.random() * Math.PI * 2;
          b.vx += Math.cos(angle) * 0.12;
          b.vy += Math.sin(angle) * 0.12;
        } else if (speed > 1.35) {
          b.vx = (b.vx / speed) * 1.35;
          b.vy = (b.vy / speed) * 1.35;
        }

        // Advance coordinates
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }

      // Step 2: Soft elastic bubble-to-bubble deflection
      for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
          const b1 = bubbles[i];
          const b2 = bubbles[j];

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dist = Math.hypot(dx, dy);
          const minDist = b1.radius + b2.radius;

          if (dist < minDist && dist > 0.001) {
            const nx = dx / dist;
            const ny = dy / dist;

            // Separate overlapping spheres
            const overlap = (minDist - dist) * 0.5;
            b1.x -= nx * overlap * 0.5;
            b1.y -= ny * overlap * 0.5;
            b2.x += nx * overlap * 0.5;
            b2.y += ny * overlap * 0.5;

            // Elastic momentum impulse
            const kx = b1.vx - b2.vx;
            const ky = b1.vy - b2.vy;
            const impulse = (2 * (nx * kx + ny * ky)) / (b1.mass + b2.mass);

            b1.vx -= impulse * b2.mass * nx * restitution;
            b1.vy -= impulse * b2.mass * ny * restitution;
            b2.vx += impulse * b1.mass * nx * restitution;
            b2.vy += impulse * b1.mass * ny * restitution;
          }
        }
      }

      // Step 3: Hardware-accelerated GPU translate3d updates
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        const node = bubbleNodesRef.current.get(b.id);
        if (node) {
          node.style.transform = `translate3d(${b.x - b.radius}px, ${b.y - b.radius}px, 0)`;
        }
      }

      animId = requestAnimationFrame(tick);
    };

    // Pause physics calculations when the browser tab is hidden to conserve battery
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animId) cancelAnimationFrame(animId);
      } else {
        lastTime = performance.now();
        animId = requestAnimationFrame(tick);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    animId = requestAnimationFrame(tick);

    return () => {
      ro.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`home-hero-bubbles-bg ${className}`}
      aria-hidden="true"
    >
      <div className="bubbles-canvas">
        {BUBBLES_PRESET.map((bubble) => {
          const diameter = bubble.radius * 2;
          return (
            <div
              key={bubble.id}
              ref={(node) => {
                if (node) bubbleNodesRef.current.set(bubble.id, node);
                else bubbleNodesRef.current.delete(bubble.id);
              }}
              className="bouncing-bubble-node"
              style={{
                width: `${diameter}px`,
                height: `${diameter}px`,
                '--bubble-accent-glow': bubble.accentGlow,
              }}
            >
              {/* Outer Translucent Glass Sphere */}
              <div className="bubble-outer-glass" />

              {/* Subtle orbital dashed halo on selected bubbles */}
              {bubble.hasRing && <div className="bubble-concentric-ring" />}

              {/* Centered Glassmorphic Pod */}
              <div
                className={`bubble-inner-badge ${
                  bubble.badgeShape === 'squircle' ? 'badge-shape-squircle' : 'badge-shape-circle'
                }`}
              >
                <span className="bubble-emoji">
                  {bubble.emoji}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
