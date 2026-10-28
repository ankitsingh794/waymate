import { useEffect, useRef, useState, useCallback } from 'react';
import {
  VscSparkle,
  VscScreenFull,
  VscScreenNormal,
  VscRefresh,
  VscBook,
  VscCheck,
  VscClose,
} from 'react-icons/vsc';
import './BouncingBubbles.css';

/* ── Initial travel bubble presets with curated emojis ────────────────────── */
const INITIAL_BUBBLES = [
  {
    id: 'flights',
    emoji: '✈️',
    label: 'Flight Routes',
    subtitle: 'Intercity hops',
    radius: 76,
    accentGlow: 'rgba(56, 189, 248, 0.35)',
    badgeShape: 'squircle',
    hasRing: true,
    vx: 0.9,
    vy: -0.7,
  },
  {
    id: 'escapes',
    emoji: '🌴',
    label: 'Coastal Escapes',
    subtitle: 'Beach & sun',
    radius: 70,
    accentGlow: 'rgba(52, 211, 153, 0.32)',
    badgeShape: 'circle',
    hasRing: false,
    vx: -0.8,
    vy: 0.85,
  },
  {
    id: 'routes',
    emoji: '🗺️',
    label: 'Route Intelligence',
    subtitle: 'Dynamic stops',
    radius: 86,
    accentGlow: 'rgba(129, 140, 248, 0.38)',
    badgeShape: 'squircle',
    hasRing: true,
    vx: 0.75,
    vy: 0.95,
  },
  {
    id: 'culinary',
    emoji: '🍜',
    label: 'Late Food Scenes',
    subtitle: 'Hidden bistros',
    radius: 66,
    accentGlow: 'rgba(251, 146, 60, 0.32)',
    badgeShape: 'squircle',
    hasRing: false,
    vx: -0.95,
    vy: -0.8,
  },
  {
    id: 'stays',
    emoji: '🏨',
    label: 'Curated Stays',
    subtitle: 'Boutique villas',
    radius: 78,
    accentGlow: 'rgba(192, 132, 252, 0.35)',
    badgeShape: 'circle',
    hasRing: true,
    vx: 0.85,
    vy: -0.9,
  },
  {
    id: 'ai-magic',
    emoji: '✨',
    label: 'AI Trip Co-pilot',
    subtitle: 'Live plan adapt',
    radius: 82,
    accentGlow: 'rgba(232, 121, 249, 0.38)',
    badgeShape: 'squircle',
    hasRing: true,
    vx: -0.7,
    vy: 0.75,
  },
  {
    id: 'cafes',
    emoji: '☕',
    label: 'Morning Cafes',
    subtitle: 'Artisan roasts',
    radius: 64,
    accentGlow: 'rgba(251, 191, 36, 0.3)',
    badgeShape: 'circle',
    hasRing: false,
    vx: 0.95,
    vy: 0.65,
  },
  {
    id: 'adventures',
    emoji: '🎒',
    label: 'Day Treks',
    subtitle: 'Scenic trails',
    radius: 62,
    accentGlow: 'rgba(244, 114, 182, 0.3)',
    badgeShape: 'squircle',
    hasRing: false,
    vx: -0.85,
    vy: -0.7,
  },
  {
    id: 'views',
    emoji: '📸',
    label: 'Golden Hours',
    subtitle: 'Scenic panoramas',
    radius: 65,
    accentGlow: 'rgba(45, 212, 191, 0.32)',
    badgeShape: 'squircle',
    hasRing: true,
    vx: 0.65,
    vy: -0.85,
  },
  {
    id: 'transit',
    emoji: '🚆',
    label: 'High-speed Rail',
    subtitle: 'Express transfers',
    radius: 68,
    accentGlow: 'rgba(96, 165, 250, 0.32)',
    badgeShape: 'circle',
    hasRing: false,
    vx: -0.75,
    vy: 0.6,
  },
];

const EXTRA_BUBBLES_POOL = [
  {
    id: 'compass',
    emoji: '🧭',
    label: 'Navigation',
    subtitle: 'Wayfinding GPS',
    radius: 70,
    accentGlow: 'rgba(56, 189, 248, 0.35)',
    badgeShape: 'circle',
    hasRing: true,
  },
  {
    id: 'mountains',
    emoji: '⛰️',
    label: 'High Peaks',
    subtitle: 'Alpine summits',
    radius: 66,
    accentGlow: 'rgba(163, 230, 53, 0.32)',
    badgeShape: 'squircle',
    hasRing: false,
  },
  {
    id: 'beach',
    emoji: '🏖️',
    label: 'Island Bay',
    subtitle: 'Warm waters',
    radius: 74,
    accentGlow: 'rgba(45, 212, 191, 0.35)',
    badgeShape: 'circle',
    hasRing: true,
  },
  {
    id: 'sunset',
    emoji: '🌅',
    label: 'Horizon Glow',
    subtitle: 'Evening twilight',
    radius: 68,
    accentGlow: 'rgba(251, 146, 60, 0.35)',
    badgeShape: 'squircle',
    hasRing: false,
  },
];

export default function BouncingBubbles({ className = '', heroHighlights = [] }) {
  const containerRef = useRef(null);
  const bubbleElementsRef = useRef(new Map());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const [bubbleList, setBubbleList] = useState(INITIAL_BUBBLES);

  // Mutable physics simulation state kept in ref to prevent re-render overhead
  const simRef = useRef({
    bubbles: [],
    width: 600,
    height: 520,
    mouse: { x: -9999, y: -9999, active: false },
    draggedBubbleId: null,
    pointerHistory: [],
    animId: null,
  });

  // Initialize or synchronize physics state from bubble list
  const syncSimulationState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.max(300, rect.width);
    const height = Math.max(320, rect.height);

    simRef.current.width = width;
    simRef.current.height = height;

    // Build or update bubbles state
    const currentBubbles = simRef.current.bubbles;
    const updatedBubbles = bubbleList.map((item, index) => {
      const existing = currentBubbles.find((b) => b.id === item.id);
      if (existing) {
        return { ...existing, ...item };
      }

      // Compute friendly spread initial position
      const cols = 3;
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cellW = width / cols;
      const cellH = height / Math.max(1, Math.ceil(bubbleList.length / cols));

      const margin = item.radius + 15;
      const startX = Math.min(
        width - margin,
        Math.max(margin, col * cellW + cellW * 0.5 + (Math.random() - 0.5) * 40)
      );
      const startY = Math.min(
        height - margin - 35,
        Math.max(margin + 45, row * cellH + cellH * 0.5 + (Math.random() - 0.5) * 35)
      );

      return {
        ...item,
        x: startX,
        y: startY,
        vx: item.vx || (Math.random() - 0.5) * 1.6,
        vy: item.vy || (Math.random() - 0.5) * 1.6,
        mass: item.radius * item.radius,
        isDragging: false,
      };
    });

    simRef.current.bubbles = updatedBubbles;
  }, [bubbleList]);

  // Handle ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          simRef.current.width = width;
          simRef.current.height = height;
        }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Main 60 FPS physics loop
  useEffect(() => {
    syncSimulationState();

    let lastTime = performance.now();

    const tick = (now) => {
      const dt = Math.min(32, Math.max(8, now - lastTime)) / 16.666; // Normalized dt (~1 at 60fps)
      lastTime = now;

      const sim = simRef.current;
      const { width, height, bubbles, mouse, draggedBubbleId } = sim;
      const topSafeZone = 55; // clearance for header controls
      const btmSafeZone = 40; // clearance for footer hints
      const restitution = 0.96; // wall bounce energy retention

      // ── Step 1: Update individual positions & wall bouncing ────────────────
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];

        if (b.isDragging) {
          continue; // Position is controlled by pointer
        }

        // Horizontal boundary bounce
        if (b.x - b.radius < 4) {
          b.x = b.radius + 4;
          b.vx = Math.abs(b.vx) * restitution;
        } else if (b.x + b.radius > width - 4) {
          b.x = width - b.radius - 4;
          b.vx = -Math.abs(b.vx) * restitution;
        }

        // Vertical boundary bounce
        if (b.y - b.radius < topSafeZone) {
          b.y = topSafeZone + b.radius;
          b.vy = Math.abs(b.vy) * restitution;
        } else if (b.y + b.radius > height - btmSafeZone) {
          b.y = height - btmSafeZone - b.radius;
          b.vy = -Math.abs(b.vy) * restitution;
        }

        // Gentle ambient drift keeping balls floating forever
        const speed = Math.hypot(b.vx, b.vy);
        if (speed < 0.35) {
          b.vx += (Math.random() - 0.5) * 0.15;
          b.vy += (Math.random() - 0.5) * 0.15;
        } else if (speed > 4.5) {
          // Clamp excessive speeds
          b.vx = (b.vx / speed) * 4.5;
          b.vy = (b.vy / speed) * 4.5;
        }

        // Subtle cursor repulsion
        if (mouse.active && draggedBubbleId !== b.id) {
          const dx = b.x - mouse.x;
          const dy = b.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          const repelRadius = b.radius + 60;
          if (dist < repelRadius && dist > 0) {
            const force = ((repelRadius - dist) / repelRadius) * 0.8;
            b.vx += (dx / dist) * force;
            b.vy += (dy / dist) * force;
          }
        }

        // Update positions with delta time
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }

      // ── Step 2: Soft elastic bubble-to-bubble collision ────────────────────
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

            // Separate overlapping balls to prevent sticking
            const overlap = (minDist - dist) * 0.5;
            if (!b1.isDragging) {
              b1.x -= nx * overlap * 0.45;
              b1.y -= ny * overlap * 0.45;
            }
            if (!b2.isDragging) {
              b2.x += nx * overlap * 0.45;
              b2.y += ny * overlap * 0.45;
            }

            // Elastic momentum impulse
            const kx = b1.vx - b2.vx;
            const ky = b1.vy - b2.vy;
            const p = (2 * (nx * kx + ny * ky)) / (b1.mass + b2.mass);

            const collisionDamping = 0.94;
            if (!b1.isDragging) {
              b1.vx -= p * b2.mass * nx * collisionDamping;
              b1.vy -= p * b2.mass * ny * collisionDamping;
            }
            if (!b2.isDragging) {
              b2.vx += p * b1.mass * nx * collisionDamping;
              b2.vy += p * b1.mass * ny * collisionDamping;
            }
          }
        }
      }

      // ── Step 3: Direct GPU transform updates (Zero React overhead) ────────
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        const el = bubbleElementsRef.current.get(b.id);
        if (el) {
          const left = b.x - b.radius;
          const top = b.y - b.radius;
          el.style.transform = `translate3d(${left.toFixed(2)}px, ${top.toFixed(2)}px, 0)`;
        }
      }

      sim.animId = requestAnimationFrame(tick);
    };

    const sim = simRef.current;
    sim.animId = requestAnimationFrame(tick);

    return () => {
      if (sim.animId) {
        cancelAnimationFrame(sim.animId);
      }
    };
  }, [syncSimulationState]);

  // Pointer interactions (Hover repulsion & Drag-and-throw)
  const handlePointerMove = (e) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    simRef.current.mouse = { x: px, y: py, active: true };

    const draggedId = simRef.current.draggedBubbleId;
    if (draggedId) {
      const bubble = simRef.current.bubbles.find((b) => b.id === draggedId);
      if (bubble) {
        bubble.x = Math.max(bubble.radius, Math.min(simRef.current.width - bubble.radius, px));
        bubble.y = Math.max(bubble.radius + 50, Math.min(simRef.current.height - bubble.radius - 35, py));

        // Track velocity history for fling
        const history = simRef.current.pointerHistory;
        history.push({ x: px, y: py, time: performance.now() });
        if (history.length > 5) history.shift();
      }
    }
  };

  const handlePointerLeave = () => {
    simRef.current.mouse.active = false;
    handlePointerUp();
  };

  const handleBubblePointerDown = (bubbleId, e) => {
    e.stopPropagation();
    simRef.current.draggedBubbleId = bubbleId;
    simRef.current.pointerHistory = [{ x: e.clientX, y: e.clientY, time: performance.now() }];

    const bubble = simRef.current.bubbles.find((b) => b.id === bubbleId);
    if (bubble) {
      bubble.isDragging = true;
    }

    const el = bubbleElementsRef.current.get(bubbleId);
    if (el) {
      el.classList.add('is-dragging');
    }
  };

  const handlePointerUp = () => {
    const draggedId = simRef.current.draggedBubbleId;
    if (!draggedId) return;

    const bubble = simRef.current.bubbles.find((b) => b.id === draggedId);
    if (bubble) {
      bubble.isDragging = false;

      // Calculate throw momentum from pointer history
      const history = simRef.current.pointerHistory;
      if (history.length >= 2) {
        const first = history[0];
        const last = history[history.length - 1];
        const dt = Math.max(16, last.time - first.time);
        const vx = ((last.x - first.x) / dt) * 16.666 * 0.45;
        const vy = ((last.y - first.y) / dt) * 16.666 * 0.45;

        bubble.vx = Math.max(-5, Math.min(5, vx || (Math.random() - 0.5) * 2));
        bubble.vy = Math.max(-5, Math.min(5, vy || (Math.random() - 0.5) * 2));
      }
    }

    const el = bubbleElementsRef.current.get(draggedId);
    if (el) {
      el.classList.remove('is-dragging');
    }

    simRef.current.draggedBubbleId = null;
    simRef.current.pointerHistory = [];
  };

  // Impulse button: energetic scatter bounce
  const triggerImpulse = () => {
    simRef.current.bubbles.forEach((b) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.2 + Math.random() * 2.5;
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed;
    });
  };

  // Add bubble from pool
  const addExtraBubble = () => {
    const unused = EXTRA_BUBBLES_POOL.filter(
      (extra) => !bubbleList.some((b) => b.id === extra.id)
    );
    if (unused.length > 0) {
      const nextBubble = unused[0];
      setBubbleList((prev) => [...prev, nextBubble]);
    } else {
      // If pool exhausted, add an energetic variant
      const randomExtra = {
        ...EXTRA_BUBBLES_POOL[Math.floor(Math.random() * EXTRA_BUBBLES_POOL.length)],
        id: `extra-${Date.now()}`,
      };
      setBubbleList((prev) => [...prev, randomExtra]);
    }
  };

  // Reset and realign bubbles
  const resetBubbles = () => {
    const width = simRef.current.width;
    const height = simRef.current.height;
    simRef.current.bubbles.forEach((b, index) => {
      const cols = 3;
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cellW = width / cols;
      const cellH = height / Math.max(1, Math.ceil(bubbleList.length / cols));
      const margin = b.radius + 15;
      b.x = Math.min(width - margin, Math.max(margin, col * cellW + cellW * 0.5 + (Math.random() - 0.5) * 30));
      b.y = Math.min(height - margin - 35, Math.max(margin + 45, row * cellH + cellH * 0.5 + (Math.random() - 0.5) * 30));
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 0.8;
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed;
      b.isDragging = false;
    });
  };

  return (
    <div
      ref={containerRef}
      className={`bouncing-bubbles-arena ${isFullscreen ? 'is-fullscreen' : ''} ${className}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerUp}
      role="region"
      aria-label="Interactive travel vibe bubbles"
    >
      {/* ── Ambient Background Glow & Geometric Rings (Matches reference screenshot) ── */}
      <div className="bubbles-ambient-bg" aria-hidden="true">
        <div className="ambient-disc ambient-disc-1" />
        <div className="ambient-disc ambient-disc-2" />
        <div className="ambient-disc ambient-disc-3" />
        <div className="ambient-ring-1" />
        <div className="ambient-ring-2" />
      </div>

      {/* ── Top Bar / Header Overlay ── */}
      <div className="bubbles-header">
        <button
          type="button"
          className="bubbles-title-pill"
          onClick={() => setShowBrief((prev) => !prev)}
          title="Click to view trip draft story"
        >
          <span className="bubbles-live-indicator" aria-hidden="true" />
          <span className="bubbles-title-tag">Live Trip Vibes</span>
          <span className="bubbles-title-sub">Lisbon + Porto</span>
        </button>

        <div className="bubbles-controls">
          <button
            type="button"
            className="bubbles-ctrl-btn"
            onClick={triggerImpulse}
            title="Scatter impulse bounce"
          >
            <VscSparkle aria-hidden="true" />
            <span>Bounce</span>
          </button>
          <button
            type="button"
            className="bubbles-ctrl-btn"
            onClick={resetBubbles}
            title="Realign bubbles"
          >
            <VscRefresh aria-hidden="true" />
          </button>
          <button
            type="button"
            className="bubbles-ctrl-btn"
            onClick={addExtraBubble}
            title="Add another vibe bubble"
          >
            <span>+ Vibe</span>
          </button>
          <button
            type="button"
            className={`bubbles-ctrl-btn ${showBrief ? 'is-active' : ''}`}
            onClick={() => setShowBrief((prev) => !prev)}
            title="Toggle itinerary draft details"
          >
            <VscBook aria-hidden="true" />
            <span>Brief</span>
          </button>
          <button
            type="button"
            className="bubbles-ctrl-btn"
            onClick={() => setIsFullscreen((prev) => !prev)}
            title={isFullscreen ? 'Exit full screen' : 'Expand full screen'}
          >
            {isFullscreen ? <VscScreenNormal aria-hidden="true" /> : <VscScreenFull aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* ── Interactive Canvas with Bouncing Glass Bubbles ── */}
      <div className="bubbles-canvas">
        {bubbleList.map((bubble) => {
          const diameter = bubble.radius * 2;
          return (
            <div
              key={bubble.id}
              ref={(node) => {
                if (node) bubbleElementsRef.current.set(bubble.id, node);
                else bubbleElementsRef.current.delete(bubble.id);
              }}
              className="bouncing-bubble-node"
              style={{
                width: `${diameter}px`,
                height: `${diameter}px`,
                '--bubble-accent-glow': bubble.accentGlow,
              }}
              onPointerDown={(e) => handleBubblePointerDown(bubble.id, e)}
              title={`${bubble.label} (${bubble.subtitle})`}
            >
              {/* Outer Translucent Glass Circle (Matches reference screenshot) */}
              <div className="bubble-outer-glass" aria-hidden="true" />

              {/* Concentric ambient ring for selected bubbles */}
              {bubble.hasRing && <div className="bubble-concentric-ring" aria-hidden="true" />}

              {/* Centered Glassmorphic Badge / Squircle Pod */}
              <div
                className={`bubble-inner-badge ${
                  bubble.badgeShape === 'squircle' ? 'badge-shape-squircle' : 'badge-shape-circle'
                }`}
              >
                <span className="bubble-emoji" role="img" aria-label={bubble.label}>
                  {bubble.emoji}
                </span>
              </div>

              {/* Hover Tooltip Pill */}
              <div className="bubble-hover-label">
                <span>{bubble.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom Hint Footer ── */}
      <div className="bubbles-footer" aria-hidden="true">
        <span className="bubbles-hint-text">
          <span className="bubbles-hint-sparkle">✨</span>
          Drag, fling, or bounce the bubbles
        </span>
        <span className="bubbles-counter">{bubbleList.length} vibes active</span>
      </div>

      {/* ── Editorial Brief Modal Overlay (Toggled from Brief button or title pill) ── */}
      {showBrief && (
        <div
          className="bubbles-brief-overlay"
          onClick={() => setShowBrief(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Trip draft editorial brief"
        >
          <article
            className="bubbles-brief-card"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="bubbles-brief-header">
              <div className="bubbles-brief-tags">
                <span className="home-editorial-note-tag">Trip Draft 05</span>
                <span className="home-editorial-note-status">Live</span>
              </div>
              <button
                type="button"
                className="bubbles-brief-close"
                onClick={() => setShowBrief(false)}
                aria-label="Close brief"
              >
                <VscClose aria-hidden="true" />
              </button>
            </header>

            <h3>"Lisbon + Porto, six days, coastal mornings and late food scenes."</h3>
            <p>
              WayMate converts this into a living itinerary with timing logic,
              local flavor, and shared approval flow.
            </p>

            <ul className="bubbles-brief-list">
              {(heroHighlights.length > 0
                ? heroHighlights
                : [
                    'Editorial-grade route framing in minutes',
                    'Shared decision flow for families, teams, and friend groups',
                    'Live itinerary resilience when plans change mid-trip',
                  ]
              ).map((item) => (
                <li key={item}>
                  <VscCheck aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="bubbles-brief-done-btn"
              onClick={() => setShowBrief(false)}
            >
              Resume Bouncing Bubbles
            </button>
          </article>
        </div>
      )}
    </div>
  );
}
