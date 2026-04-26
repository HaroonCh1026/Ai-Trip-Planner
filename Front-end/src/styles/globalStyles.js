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
`;
