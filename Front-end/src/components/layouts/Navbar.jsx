import React, { useState, useEffect } from "react";
import { C } from "../../styles/colors";
import { Icon } from "../Icon";

// Section ids that exist on the LandingPage. Must match the `id` attributes
// on AboutSection / BlogsSection / PricingSection respectively.
// "Support" was removed in UI Round 3 — there is no #support section on
// the landing page, so the link was dead.
const NAV_LINKS = [
  { id: "about", label: "About" },
  { id: "blogs", label: "Blogs" },
  { id: "pricing", label: "Pricing" },
];

export default function Navbar({ onLogin, onSignup }) {
  const [scrolled, setScrolled] = useState(false);
  // UI Round 3: which anchor section is currently in view (drives the
  // crimson underline on the matching nav link). Empty string = none.
  const [activeSection, setActiveSection] = useState("");
  // UI Round 3: mobile drawer toggle (presentation-only state).
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Original scroll-shadow effect — preserved verbatim.
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // UI Round 3: track which landing section is currently in the viewport
  // using IntersectionObserver. Picks whichever observed section has the
  // highest intersectionRatio at any given moment. No new dependencies.
  useEffect(() => {
    const sections = NAV_LINKS
      .map((l) => document.getElementById(l.id))
      .filter(Boolean);

    if (sections.length === 0) return; // not on landing page

    let visibility = new Map(); // id -> intersectionRatio

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => visibility.set(e.target.id, e.intersectionRatio));
        let bestId = "";
        let bestRatio = 0;
        for (const [id, ratio] of visibility) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        // Only mark active when at least somewhat visible — avoids flicker
        // on the hero (which has no observed id).
        setActiveSection(bestRatio > 0.15 ? bestId : "");
      },
      {
        // Observe the middle 60% of the viewport — feels right for "this
        // is the section the user is reading right now".
        rootMargin: "-20% 0px -20% 0px",
        threshold: [0, 0.15, 0.3, 0.5, 0.7, 1],
      }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  // Smooth-scroll to a section. Used by both desktop link clicks and the
  // mobile drawer items, so we close the drawer at the same time.
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  };

  // Logo click — original behavior preserved (smooth scroll to top).
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(16px, 5vw, 48px)",
          height: 64,
          background: scrolled ? "rgba(13,13,13,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled
            ? "1px solid rgba(140,50,50,0.2)"
            : "1px solid transparent",
          transition: "background 0.3s ease, border-color 0.3s ease",
        }}
      >
        {/* Logo */}
        <button
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="vai-focusable"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              background: C.crimson,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon.plane />
          </div>
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 19,
              fontWeight: 700,
              color: C.offWhite,
            }}
          >
            Voyageur<span style={{ color: C.crimson }}>AI</span>
          </span>
        </button>

        {/* Desktop links + auth */}
        <div
          className="vai-desktop-only"
          style={{ alignItems: "center", gap: 26 }}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(link.id);
              }}
              className={`vai-pubnav-link vai-focusable ${
                activeSection === link.id ? "is-active" : ""
              }`}
            >
              {link.label}
            </a>
          ))}
          <div
            aria-hidden
            style={{
              width: 1,
              height: 22,
              background: "rgba(255,255,255,0.08)",
              margin: "0 4px",
            }}
          />
          <button
            className="btn-secondary vai-focusable"
            style={{ padding: "9px 22px", fontSize: 14 }}
            onClick={onLogin}
          >
            Sign In
          </button>
          <button
            className="btn-primary vai-focusable"
            style={{ padding: "9px 22px", fontSize: 14 }}
            onClick={onSignup}
          >
            Get Started <Icon.arrow />
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="vai-mobile-only vai-focusable"
          onClick={() => setMobileMenuOpen((v) => !v)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: C.offWhite,
            width: 40,
            height: 40,
            borderRadius: 8,
            cursor: "pointer",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {mobileMenuOpen ? <Icon.close /> : <Icon.menu />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="vai-mobile-only vai-pubnav-drawer">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(link.id);
              }}
              className={`vai-pubnav-drawer-link vai-focusable ${
                activeSection === link.id ? "is-active" : ""
              }`}
            >
              {link.label}
            </a>
          ))}
          <div
            aria-hidden
            style={{
              height: 1,
              background: "rgba(255,255,255,0.08)",
              margin: "8px 0",
            }}
          />
          <button
            className="btn-secondary vai-focusable"
            style={{ padding: "12px 22px", fontSize: 14, justifyContent: "center" }}
            onClick={() => {
              setMobileMenuOpen(false);
              onLogin();
            }}
          >
            Sign In
          </button>
          <button
            className="btn-primary vai-focusable"
            style={{ padding: "12px 22px", fontSize: 14, justifyContent: "center", marginTop: 8 }}
            onClick={() => {
              setMobileMenuOpen(false);
              onSignup();
            }}
          >
            Get Started <Icon.arrow />
          </button>
        </div>
      )}
    </>
  );
}