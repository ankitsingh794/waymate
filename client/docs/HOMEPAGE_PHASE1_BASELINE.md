# Homepage Revamp Phase 1 Baseline

Date: 2026-04-22
Scope: client homepage revamp preparation

## Status
Phase 1 is complete.

## 1.1 Entry points and dependency validation

### Route mapping
- `/` renders `Home` via `client/src/App.jsx`.
- `/assistant` and `/dashboard` exist and remain protected routes.
- `/register` and `/login` exist for unauthenticated CTA paths.

### Auth-driven CTA targets
- In `Home`, `plannerPath` resolves to `/assistant` when authenticated, otherwise `/register`.
- In `Home`, `startPath` resolves to `/dashboard` when authenticated, otherwise `/register`.
- In `Navbar`, the logo link resolves to `/dashboard` when authenticated, otherwise `/`.
- In `Navbar`, authenticated nav includes `/dashboard` and `/assistant`; unauthenticated nav includes `/` and `/login`.

### Anchor targets
- `#features` target exists on the section in `Cards`.
- `#proof` target exists on the section in `Home`.
- Links to `#features` and `#proof` are present in homepage/nav/footer.

## 1.2 Homepage component contract baseline

### Home (`client/src/pages/HomePage/Home.jsx`)
- Default export function `Home()`.
- Depends on `useAuth()` and currently reads `isAuthenticated`.
- Composes `Navbar`, `Globe`, `Cards`, and `Feedback`.
- Uses local arrays/constants for steps, proof, and stats.
- Must keep auth-dependent CTA path behavior unchanged.

### Cards (`client/src/pages/HomePage/Cards.jsx`)
- Default export function `Cards()`.
- No external props.
- Owns `cardsData` and renders section with `id="features"`.
- Renders icon component dynamically via `createElement(icon, ...)`.

### Globe (`client/src/pages/HomePage/Globe.jsx`)
- Default export function `Globe()`.
- No external props.
- Owns local highlights array and decorative globe markup.

### Feedback (`client/src/pages/HomePage/Feedback.jsx`)
- Default export function `Feedback()`.
- No external props.
- Owns local testimonial data and star icon rendering.

### Navbar (`client/src/components/navbar.jsx`)
- Default export function `Navbar()`.
- Depends on `useAuth()` and reads `isAuthenticated` and `logout`.
- Owns mobile menu state and outside-click behavior.
- Must preserve auth-aware link sets and logout behavior.

### Auth context contract used by homepage/nav
- `useAuth()` currently exposes `isAuthenticated` and `logout` via provider value.

## 1.3 Scope boundaries for redesign

### Included in homepage revamp scope
- `client/src/pages/HomePage/Home.jsx`
- `client/src/pages/HomePage/Cards.jsx`
- `client/src/pages/HomePage/Globe.jsx`
- `client/src/pages/HomePage/Feedback.jsx`
- `client/src/pages/HomePage/Home.css`
- `client/src/pages/HomePage/Cards.css`
- `client/src/pages/HomePage/Globe.css`
- `client/src/pages/HomePage/Feedback.css`
- `client/src/components/navbar.jsx`
- `client/src/components/navbar.css`

### Excluded from homepage revamp scope
- Dashboard and all authenticated internal pages outside homepage/nav touch points.
- Backend/server changes.
- App-wide component library or global architecture migrations.

## Gate for Phase 2
Phase 2 can start with UI Pro Max design-system mapping because route, auth contract, anchors, and scope boundaries are now verified and documented.
