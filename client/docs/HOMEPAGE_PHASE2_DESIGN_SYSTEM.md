# Homepage Revamp Phase 2 Design System

Date: 2026-04-22
Scope: UI Pro Max mapping and homepage design foundations
Status: Completed

## Objective
Phase 2 establishes the visual and interaction foundation before structural refactor work:
- Map style direction from UI Pro Max references.
- Build a homepage-scoped Forest and Sand token layer.
- Choose and wire typography pair with multilingual-safe fallback.
- Define cinematic motion rules with reduced-motion safety.

## UI Pro Max Mapping

### Selected style references
- styles.csv: Glassmorphism (frosted cards, layered depth, translucent borders)
- styles.csv: Editorial Grid / Magazine (headline hierarchy and asymmetrical composition)
- styles.csv: Motion-Driven (intentional transitions, reveal rhythm, controlled durations)
- styles.csv: Nature Distilled (forest, sand, earthy warmth for premium tone)

### Selected palette direction
Forest and Sand blend adapted from Nature Distilled guidance:
- Forest deep and mid tones for trust and structural hierarchy.
- Sand tones for warmth, highlights, and premium contrast.
- Neutral ink text colors for readability on glass surfaces.

## Token Layer (Homepage Scoped)
Implemented in Home.css under .home-page using local overrides to avoid app-wide side effects.

### Core color tokens
- --home-forest-900: #173328
- --home-forest-800: #1f4333
- --home-forest-700: #2a5a46
- --home-forest-600: #356c54
- --home-sand-500: #a67b52
- --home-sand-300: #d7bc9c
- --home-sand-200: #eadac4
- --home-sand-100: #f8f2e8
- --home-ink-900: #18251e
- --home-ink-700: #46574e

### Surface tokens
- --home-glass-surface
- --home-glass-strong
- --home-glass-border
- --home-glass-shadow

### Scoped compatibility overrides
Homepage now remaps shared color variables locally:
- --color-primary, --color-primary-light
- --color-secondary, --color-secondary-light
- --color-text-primary, --color-text-secondary
- --color-gray-50, --color-gray-100, --color-white

This keeps existing component CSS working while shifting the homepage palette.

## Typography System

### Pairing decision
- Display: Playfair Display
- Body/UI: Inter
- Multilingual fallback: Noto Sans

### Rationale
- Editorial premium headline tone from Playfair Display.
- High UI readability and mobile clarity from Inter.
- Better language coverage from Noto Sans fallback.

### Wiring
- Font imports moved to Home.css for homepage-scoped direction.
- .home-page now uses body font by default.
- h1/h2 and footer headings use display font for editorial hierarchy.

## Motion System Rules

### Motion profile
Cinematic but controlled:
- --home-motion-duration-s: 220ms
- --home-motion-duration-m: 420ms
- --home-motion-duration-l: 760ms
- --home-motion-ease: cubic-bezier(0.22, 1, 0.36, 1)
- --home-motion-hover-lift: -3px

### Safety and accessibility
Reduced-motion behavior is defined at token level:
- Under prefers-reduced-motion, motion durations collapse to 1ms.
- Hover lift is disabled.
- Existing no-animation rules for decorative orb effects are preserved.

### Touch-safe behavior
Motion values are tuned for readability and avoid aggressive movement that can feel jittery on mobile touch devices.

## Phase 2 Deliverables
- Homepage-scoped design token foundation created.
- Typography pairing selected and wired.
- Motion policy and reduced-motion strategy defined and encoded.
- Direction documented for use in Phase 3 and Phase 4 implementation.

## Next Step
Proceed to Phase 3 (information architecture and full copy rewrite) using this token and motion foundation.
