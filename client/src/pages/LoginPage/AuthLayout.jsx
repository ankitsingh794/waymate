import { Link } from 'react-router-dom';

/**
 * AuthLayout — shared split-panel wrapper (Phase 4B)
 *
 * Left: 45% dark forest panel — logo, editorial headline, trust bullets, proof strip
 * Right: 55% canvas panel — holds the form card
 *
 * Props:
 *   children      — the form card content
 *   headline      — left panel h2 text (JSX allowed)
 *   subline       — left panel subtitle
 */

const TRUST_BULLETS = [
    'Editorial-grade route planning in minutes',
    'Shared team itinerary with real-time updates',
    'Live adaptation when plans change mid-trip',
];

const PROOF_AVATARS = [
    { initials: 'NK', label: 'Nina K.' },
    { initials: 'TR', label: 'Theo R.' },
    { initials: 'AL', label: 'Ari L.' },
    { initials: 'SM', label: 'Sofia M.' },
];

export default function AuthLayout({ children, headline, subline }) {
    return (
        <div className="auth-page">
            {/* ── Left panel ── */}
            <aside className="auth-panel-left" aria-hidden="true">
                {/* Wordmark */}
                <Link to="/" className="auth-panel-logo">
                    <span className="auth-panel-logo-mark">WayMate</span>
                    <span className="auth-panel-logo-sub">Atelier</span>
                </Link>

                {/* Editorial copy */}
                <div className="auth-panel-copy">
                    <span className="auth-panel-eyebrow">Trip planning, reinvented</span>
                    <h2 className="auth-panel-headline">
                        {headline || (
                            <>
                                Plan journeys with<br />
                                <em>editorial taste</em><br />
                                and precision.
                            </>
                        )}
                    </h2>
                    {subline && <p className="auth-panel-sub">{subline}</p>}

                    <ul className="auth-panel-trust" aria-label="Key features">
                        {TRUST_BULLETS.map((b) => (
                            <li key={b}>{b}</li>
                        ))}
                    </ul>
                </div>

                {/* Social proof strip */}
                <div className="auth-panel-proof">
                    <div className="auth-panel-avatars" aria-hidden="true">
                        {PROOF_AVATARS.map((a) => (
                            <div key={a.initials} className="auth-panel-avatar">
                                {a.initials}
                            </div>
                        ))}
                    </div>
                    <div className="auth-panel-proof-copy">
                        <strong>42,000+ travelers</strong>
                        <span>trust WayMate every month</span>
                    </div>
                </div>
            </aside>

            {/* ── Right panel ── */}
            <main className="auth-panel-right">
                {children}
            </main>
        </div>
    );
}
