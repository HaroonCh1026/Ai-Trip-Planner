import { C } from "../styles/colors";
export const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;900&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html { scroll-behavior: smooth; }
  body {
    font-family: 'DM Sans', sans-serif;
    background: ${C.nearBlack};
    color: ${C.offWhite};
    overflow-x: hidden;
    line-height: 1.6;
    min-height: 100vh;
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${C.nearBlack}; }
  ::-webkit-scrollbar-thumb { background: ${C.crimson}; border-radius: 3px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes pulse {
    0%,100% { transform: scale(1); }
    50%      { transform: scale(1.04); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes slideDot {
    0%   { transform: translateX(0); opacity:1; }
    50%  { transform: translateX(6px); opacity:.5; }
    100% { transform: translateX(0); opacity:1; }
  }
  @keyframes typewriter {
    from { width: 0; }
    to   { width: 100%; }
  }
  @keyframes float {
    0%,100% { transform: translateY(0); }
    50%      { transform: translateY(-12px); }
  }
  @keyframes gradientShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes lineGrow {
    from { width: 0; } to { width: 100%; }
  }

  .anim-fadeUp  { animation: fadeUp 0.7s ease forwards; }
  .anim-fadeIn  { animation: fadeIn 0.5s ease forwards; }
  .anim-delay1  { animation-delay: 0.1s; opacity:0; }
  .anim-delay2  { animation-delay: 0.2s; opacity:0; }
  .anim-delay3  { animation-delay: 0.35s; opacity:0; }
  .anim-delay4  { animation-delay: 0.5s; opacity:0; }
  .anim-delay5  { animation-delay: 0.65s; opacity:0; }

  .hover-lift {
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }
  .hover-lift:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 50px rgba(140,50,50,0.25);
  }

  .btn-primary {
    background: ${C.crimson};
    color: ${C.white};
    border: none;
    padding: 14px 32px;
    border-radius: 4px;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    display: inline-flex; align-items:center; gap:8px;
  }
  .btn-primary:hover {
    background: ${C.crimsonLight};
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(140,50,50,0.4);
  }
  .btn-secondary {
    background: transparent;
    color: ${C.offWhite};
    border: 1.5px solid ${C.midGray};
    padding: 13px 30px;
    border-radius: 4px;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s, transform 0.15s;
    display: inline-flex; align-items:center; gap:8px;
  }
  .btn-secondary:hover {
    border-color: ${C.crimson};
    color: ${C.crimson};
    transform: translateY(-2px);
  }

  .card {
    background: ${C.darkGray};
    border: 1px solid rgba(140,50,50,0.15);
    border-radius: 8px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .card:hover { border-color: rgba(140,50,50,0.4); }

  .section-label {
    font-family: 'DM Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.18em;
    color: ${C.crimson};
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .display-heading {
    font-family: 'Playfair Display', serif;
    font-weight: 700;
    line-height: 1.12;
    color: ${C.offWhite};
  }

  input, select, textarea {
    background: ${C.darkGray};
    border: 1.5px solid rgba(255,255,255,0.1);
    color: ${C.offWhite};
    border-radius: 6px;
    padding: 12px 16px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
    width: 100%;
  }
  input:focus, select:focus, textarea:focus {
    border-color: ${C.crimson};
  }
  input::placeholder { color: ${C.midGray}; }

  .noise-overlay::after {
    content: '';
    position: fixed; inset: 0; z-index: 999; pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
    opacity: 0.4;

    
  }

  /* ─────────────────────────────────────────────────────────────
     UI Round 1 — Dashboard polish helpers (presentation only)
     Added classes are additive; nothing above this block changed.
     ───────────────────────────────────────────────────────────── */

  /* Visible focus rings for keyboard users — applies anywhere we
     opt-in with .vai-focusable. We don't use a global :focus-visible
     because the codebase already overrides input focus-borders. */
  .vai-focusable:focus-visible {
    outline: 2px solid ${C.crimson};
    outline-offset: 2px;
    border-radius: 6px;
  }

  /* Polished card lift — softer shadow than the existing .hover-lift,
     used for trip cards and stat cards. */
  .vai-card-lift {
    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  }
  .vai-card-lift:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 36px rgba(0,0,0,0.45), 0 0 0 1px rgba(140,50,50,0.25);
    border-color: rgba(140,50,50,0.35);
  }

  /* Trip-card image zoom on hover (parent has .vai-trip-card) */
  .vai-trip-card .vai-trip-img {
    transition: transform 0.5s ease;
  }
  .vai-trip-card:hover .vai-trip-img {
    transform: scale(1.06);
  }

  /* Top-nav tab — keyboard + hover nicety beyond inline styles */
  .vai-nav-tab {
    transition: background 0.18s ease, color 0.18s ease;
  }
  .vai-nav-tab:hover {
    color: ${C.offWhite};
  }

  /* Mobile-first responsive helpers used by the Dashboard.
     Desktop is the default; we override at <=768px. */
  .vai-desktop-only { display: flex; }
  .vai-mobile-only  { display: none; }

  /* Drawer animation */
  @keyframes vaiDrawerIn {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .vai-drawer {
    animation: vaiDrawerIn 0.18s ease-out;
  }

  @media (max-width: 768px) {
    .vai-desktop-only { display: none !important; }
    .vai-mobile-only  { display: flex !important; }

    /* Stats grid drops from 4 → 2 cols on tablet/phone, then 1 col below 420px */
    .vai-stats-grid {
      grid-template-columns: repeat(2, 1fr) !important;
    }
  }
  @media (max-width: 420px) {
    .vai-stats-grid {
      grid-template-columns: 1fr !important;
    }
  }

  /* Subtle gold ghost button used for the secondary "Upgrade to Pro"
     header action. Replaces the prior loud yellow gradient. */
  .vai-pro-ghost {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: rgba(255,180,0,0.06);
    border: 1.5px solid rgba(255,180,0,0.45);
    border-radius: 8px;
    color: #FFB400;
    font-size: 13px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: background 0.18s ease, border-color 0.18s ease, transform 0.15s ease;
  }
  .vai-pro-ghost:hover:not(:disabled) {
    background: rgba(255,180,0,0.14);
    border-color: rgba(255,180,0,0.7);
    transform: translateY(-1px);
  }
  .vai-pro-ghost:disabled { cursor: wait; opacity: 0.6; }

  /* ─────────────────────────────────────────────────────────────
     UI Round 2 — Itinerary view polish helpers
     Additive only; nothing above this block changed.
     ───────────────────────────────────────────────────────────── */

  /* The day-grid layout: 280px sidebar + 1fr details on desktop,
     stacked single column with a horizontal day-pill picker on mobile. */
  .vai-day-grid {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 32px;
    padding-top: 32px;
  }
  .vai-day-sidebar-desktop { display: block; }
  .vai-day-sidebar-mobile  { display: none; }

  @media (max-width: 768px) {
    .vai-day-grid {
      grid-template-columns: 1fr !important;
      gap: 20px !important;
      padding-top: 20px !important;
    }
    .vai-day-sidebar-desktop { display: none !important; }
    .vai-day-sidebar-mobile  { display: block !important; }
  }

  /* Mobile: horizontal day pill scroller. Hides the scrollbar so it
     looks like a slick pill row, but remains scrollable by drag/swipe. */
  .vai-day-pills {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 4px 0 12px;
    scrollbar-width: none;
    -ms-overflow-style: none;
    scroll-snap-type: x proximity;
  }
  .vai-day-pills::-webkit-scrollbar { display: none; }
  .vai-day-pill {
    flex-shrink: 0;
    scroll-snap-align: start;
  }

  /* Activity card chevron — rotates when the card is expanded. */
  .vai-chevron {
    transition: transform 0.2s ease;
    color: ${C.midGray};
    flex-shrink: 0;
  }
  .vai-chevron-open { transform: rotate(180deg); }

  /* Hero back button — refined hover & focus. */
  .vai-hero-back:hover {
    background: rgba(13,13,13,0.85) !important;
    border-color: rgba(255,255,255,0.3) !important;
  }

  /* ─────────────────────────────────────────────────────────────
     UI Round 3 — Public Navbar polish helpers
     Additive only; nothing above this block changed.
     ───────────────────────────────────────────────────────────── */

  /* Public-nav link — uses CSS for hover/active so we don't fight inline
     styles or stale event-target references. */
  .vai-pubnav-link {
    color: ${C.midGray};
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    padding: 8px 4px;
    position: relative;
    transition: color 0.18s ease;
    font-family: 'DM Sans', sans-serif;
    background: transparent;
    border: none;
    cursor: pointer;
  }
  .vai-pubnav-link:hover { color: ${C.offWhite}; }

  /* Underline that grows when the link is the active scroll section. */
  .vai-pubnav-link::after {
    content: '';
    position: absolute;
    left: 4px;
    right: 4px;
    bottom: 2px;
    height: 1.5px;
    background: ${C.crimson};
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform 0.22s ease;
  }
  .vai-pubnav-link.is-active {
    color: ${C.offWhite};
  }
  .vai-pubnav-link.is-active::after {
    transform: scaleX(1);
  }

  /* Public-nav mobile drawer — slides in below the fixed nav. */
  .vai-pubnav-drawer {
    position: fixed;
    top: 64px;
    left: 0;
    right: 0;
    z-index: 99;
    background: rgba(13,13,13,0.98);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(140,50,50,0.2);
    padding: 14px clamp(16px, 5vw, 48px) 18px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    animation: vaiDrawerIn 0.18s ease-out;
  }
  .vai-pubnav-drawer-link {
    text-align: left;
    background: transparent;
    border: none;
    color: ${C.offWhite};
    padding: 14px 8px;
    border-radius: 6px;
    font-size: 15px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.15s ease;
  }
  .vai-pubnav-drawer-link:hover {
    background: rgba(255,255,255,0.04);
  }
  .vai-pubnav-drawer-link.is-active {
    color: ${C.crimsonLight};
    background: rgba(140,50,50,0.12);
  }
    /* ─────────────────────────────────────────────────────────────
     UI Round 4 — Admin Panel mobile responsiveness (<=480px)
     Additive only. Desktop (>480px) is unchanged.
     ───────────────────────────────────────────────────────────── */

  /* The grid wrapper — desktop default = 260px sidebar + content */
  .vai-admin-shell {
    display: grid;
    grid-template-columns: 260px 1fr;
    min-height: 100vh;
  }

  /* Sidebar shows by default; mobile hamburger hides on desktop */
  .vai-admin-sidebar { display: flex; }
  .vai-admin-hamburger { display: none; }
  .vai-admin-backdrop { display: none; }

  /* Header default — title row is a normal flex row */
  .vai-admin-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 40px;
    gap: 16px;
    flex-wrap: wrap;
  }
  .vai-admin-content-pad {
    padding: 32px 40px;
  }

  /* Mobile overrides */
  @media (max-width: 480px) {
    .vai-admin-shell {
      grid-template-columns: 1fr !important;
    }

    /* Sidebar becomes a slide-in drawer. Hidden by default;
       opens via .is-open toggle from AdminPanel.jsx. */
    .vai-admin-sidebar {
      position: fixed !important;
      top: 0;
      left: 0;
      bottom: 0;
      width: min(280px, 80vw);
      z-index: 200;
      transform: translateX(-100%);
      transition: transform 0.22s ease;
    }
    .vai-admin-sidebar.is-open {
      transform: translateX(0);
      box-shadow: 4px 0 24px rgba(0,0,0,0.5);
    }

    /* Backdrop behind the open drawer */
    .vai-admin-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      z-index: 150;
      animation: fadeIn 0.18s ease-out;
    }

    /* Hamburger button shows on mobile */
    .vai-admin-hamburger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: ${C.offWhite};
      cursor: pointer;
      flex-shrink: 0;
    }
    .vai-admin-hamburger:hover {
      background: rgba(140,50,50,0.18);
      border-color: ${C.crimson};
    }

    /* Header tightens up */
    .vai-admin-header-row {
      margin-bottom: 24px !important;
      gap: 12px !important;
    }
    .vai-admin-header-row h1 {
      font-size: 22px !important;
    }
    .vai-admin-header-row p {
      font-size: 12px !important;
    }
    .vai-admin-content-pad {
      padding: 16px 14px !important;
    }

    /* Admin stat cards: 1 column on phones */
    .vai-admin-stats {
      grid-template-columns: 1fr !important;
      gap: 12px !important;
      margin-bottom: 20px !important;
    }
    .vai-admin-stats .card {
      padding: 18px !important;
    }

    /* The chart + regions split goes 1 column */
    .vai-admin-twocol {
      grid-template-columns: 1fr !important;
      gap: 14px !important;
      margin-bottom: 16px !important;
    }
    .vai-admin-twocol .card {
      padding: 18px !important;
    }
    .vai-admin-twocol h3 {
      font-size: 16px !important;
      margin-bottom: 14px !important;
    }

    /* Chart bars: smaller min-gap, scrollable if cramped */
    .vai-admin-chart {
      height: 130px !important;
      gap: 3px !important;
    }
  }
    /* ─────────────────────────────────────────────────────────────
     UI Round 5 — Admin inner-page mobile helpers (<=480px)
     Reusable across AdminUsers, AdminBookings, AdminPricing, etc.
     ───────────────────────────────────────────────────────────── */

  /* Force any auto-fit grid to a single column on phones. Apply this
     class to the existing grid div in addition to its inline styles —
     the !important here beats the inline gridTemplateColumns. */
  @media (max-width: 480px) {
    .vai-admin-grid-1col {
      grid-template-columns: 1fr !important;
      gap: 12px !important;
    }

    /* Filter row: search + selects stack full-width */
    .vai-admin-filter-row {
      flex-direction: column !important;
      gap: 10px !important;
    }
    .vai-admin-filter-row > * {
      width: 100% !important;
      min-width: 0 !important;
    }

    /* Mobile table → card list switcher.
       Add .vai-admin-table-wrap to the card-around-table div.
       Add .vai-admin-table to the <table>.
       Add .vai-admin-cards to the alternate card list (renders only on mobile). */
    .vai-admin-table-wrap .vai-admin-table { display: none !important; }
    .vai-admin-table-wrap .vai-admin-cards { display: flex !important; }

    /* Pricing section header: title + summary stack inside its row
       so the chevron stays right-aligned and nothing truncates. */
    .vai-admin-section-head {
      padding: 14px 16px !important;
    }
    .vai-admin-section-head .vai-admin-section-title {
      font-size: 15px !important;
    }
    .vai-admin-section-head .vai-admin-section-summary {
      white-space: normal !important;
      font-size: 11px !important;
      line-height: 1.45 !important;
    }
    .vai-admin-section-body {
      padding: 0 16px 18px !important;
    }

    /* Pricing action row: stack on mobile, full-width buttons */
    .vai-admin-action-row {
      flex-direction: column-reverse !important;
      gap: 8px !important;
    }
    .vai-admin-action-row > button {
      width: 100% !important;
    }

    /* KPI strip: 2 cols on phone (instead of 4) so values stay legible */
    .vai-admin-kpi-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 10px !important;
    }
    .vai-admin-kpi-grid .card {
      padding: 14px !important;
    }
  }

  /* Mobile-only card list: hidden on desktop, shown only inside
     .vai-admin-table-wrap on mobile (handled by media query above). */
  .vai-admin-cards {
    display: none;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
  }
  .vai-admin-row-card {
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 8px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .vai-admin-row-card .vai-row-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
  }
  .vai-admin-row-card .vai-row-meta {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 10px;
    font-size: 12px;
  }
  .vai-admin-row-card .vai-row-meta dt {
    color: ${C.midGray};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 10px;
  }
  .vai-admin-row-card .vai-row-meta dd {
    color: ${C.offWhite};
    word-break: break-word;
  }
  .vai-admin-row-card .vai-row-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .vai-admin-row-card .vai-row-actions > button {
    flex: 1;
    min-width: 0;
  }
    /* ─────────────────────────────────────────────────────────────
     UI Round 6 — AdminSupport + AdminBlogs mobile helpers (<=480px)
     Additive only.
     ───────────────────────────────────────────────────────────── */

  @media (max-width: 480px) {
    /* AdminSupport — split pane becomes single column.
       Thread panel becomes a fullscreen overlay. */
    .vai-admin-support-grid {
      grid-template-columns: 1fr !important;
      gap: 0 !important;
    }
    .vai-admin-thread-panel {
      position: fixed !important;
      inset: 0 !important;
      z-index: 250 !important;
      height: 100vh !important;
      max-height: 100vh !important;
      border-radius: 0 !important;
      margin: 0 !important;
    }

    /* Status filter chips wrap to 2 rows neatly */
    .vai-admin-support-filters {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 10px !important;
    }
    .vai-admin-support-filters > .vai-admin-search {
      width: 100% !important;
      min-width: 0 !important;
    }
    .vai-admin-support-filter-chips {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 6px !important;
    }
    .vai-admin-support-filter-chips > button {
      flex: 1 1 calc(50% - 3px) !important;
      min-width: 0 !important;
      padding: 8px 10px !important;
      font-size: 12px !important;
    }

    /* Ticket list rows tighten */
    .vai-admin-ticket-row {
      padding: 14px 16px !important;
    }

    /* Thread panel: status-change buttons wrap */
    .vai-admin-thread-actions {
      flex-wrap: wrap !important;
    }

    /* AdminBlogs — form layout single column */
    .vai-admin-blog-form-grid {
      grid-template-columns: 1fr !important;
      gap: 16px !important;
    }

    /* Blog list header: title row + new post button stack */
    .vai-admin-blog-header {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 12px !important;
    }
    .vai-admin-blog-header > button {
      width: 100% !important;
      justify-content: center !important;
    }

    /* Blog card grid → 1 column */
    .vai-admin-blog-grid {
      grid-template-columns: 1fr !important;
      gap: 14px !important;
    }

    /* Blog card footer: author/readtime stack above the action row */
    .vai-admin-blog-card-footer {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 12px !important;
    }
    .vai-admin-blog-card-footer .vai-blog-meta {
      font-size: 11px !important;
    }
    .vai-admin-blog-card-footer .vai-blog-actions {
      display: flex !important;
      gap: 6px !important;
    }
    .vai-admin-blog-card-footer .vai-blog-actions > button {
      flex: 1 !important;
      padding: 8px 6px !important;
      min-width: 0 !important;
    }
  }
    /* ─────────────────────────────────────────────────────────────
     UI Round 7 — AdminLogs row layout helper (<=480px)
     Reuses existing helpers for the rest.
     ───────────────────────────────────────────────────────────── */

  @media (max-width: 480px) {
    /* Log row: 3-col grid (icon · details · timestamp) → stack timestamp
       under the details so neither column gets squished. */
    .vai-admin-log-row {
      grid-template-columns: auto 1fr !important;
      gap: 10px !important;
      padding: 14px 16px !important;
    }
    .vai-admin-log-row .vai-log-time {
      grid-column: 1 / -1 !important;
      padding-left: 30px !important;
      font-size: 11px !important;
    }
  }

/* ─── UI Round 8 — User-facing pages mobile (≤ 480 px) ──────────────────
     Auth pages, Navbar drawer, Dashboard, ItineraryView, BookingConfirmation
     All rules use vai-* classes that are added to JSX in the same session.  */

  /* ─ Auth: reduce card inner padding so it breathes on a phone ─ */
  .vai-auth-card { /* default: no-op — inline style applies */ }
  @media (max-width: 480px) {
    .vai-auth-card { padding: 28px 20px !important; }
  }

  /* ─ Auth: phone + city side-by-side → one column on phones ─ */
  .vai-auth-2col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  @media (max-width: 480px) {
    .vai-auth-2col { grid-template-columns: 1fr !important; }
  }

  /* ─ Cost comparison panel: 3 columns → 1 column on phones ─ */
  @media (max-width: 480px) {
    .vai-cost-compare-grid {
      grid-template-columns: 1fr !important;
    }
  }

  /* ─ BookingConfirmation: action row → stack vertically on phones ─ */
  @media (max-width: 480px) {
    .vai-booking-actions {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 10px !important;
    }
    .vai-booking-actions > button,
    .vai-booking-actions > a {
      width: 100% !important;
      justify-content: center !important;
      text-align: center !important;
    }
  }

  /* ─ Navbar public drawer: ensure it is full-width on very narrow phones ─ */
  @media (max-width: 480px) {
    .vai-pubnav-drawer {
      left: 0 !important;
      right: 0 !important;
      width: 100% !important;
    }
  }

  /* ─ Itinerary day content: tighten left timeline indent on phones ─ */
  @media (max-width: 480px) {
    .vai-day-content-indent { padding-left: 20px !important; }
  }

  /* ─ Itinerary activity meta row: allow wrapping on phones ─ */
  @media (max-width: 480px) {
    .vai-activity-meta {
      flex-wrap: wrap !important;
      gap: 4px 8px !important;
    }
  }

  /* ─ Dashboard explore / trips grid already uses auto-fill + minmax which
     collapses naturally; no override needed. Stats grid handled in Round 1. ─ */
`;