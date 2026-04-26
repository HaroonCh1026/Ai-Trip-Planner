import React, { useState, useEffect } from "react";
import { C } from "../../styles/colors";
import { Icon } from "../Icon";

export default function Navbar({ onLogin, onSignup }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = ["About", "Blogs", "Pricing", "Support"];

  return (
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
        padding: "0 5%",
        height: "72px",
        background: scrolled ? `rgba(13,13,13,0.95)` : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? `1px solid rgba(140,50,50,0.2)` : "none",
        transition: "all 0.3s ease",
      }}
    >
      <Logo />
      <NavLinks links={navLinks} />
      <AuthButtons onLogin={onLogin} onSignup={onSignup} />
    </nav>
  );
}

const Logo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div
      style={{
        width: 32,
        height: 32,
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
        fontSize: 20,
        fontWeight: 700,
        color: C.offWhite,
        cursor: "pointer",
      }}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      Voyageur<span style={{ color: C.crimson }}>AI</span>
    </span>
  </div>
);

const NavLinks = ({ links }) => (
  <div style={{ display: "flex", gap: 24 }}>
    {links.map((link) => (
      <a
        key={link}
        href={`#${link.toLowerCase()}`}
        style={{
          color: C.midGray,
          fontSize: 14,
          fontWeight: 500,
          textDecoration: "none",
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) => (e.target.style.color = C.offWhite)}
        onMouseLeave={(e) => (e.target.style.color = C.midGray)}
      >
        {link}
      </a>
    ))}
  </div>
);

const AuthButtons = ({ onLogin, onSignup }) => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <button
      className="btn-secondary"
      style={{ padding: "9px 22px", fontSize: 14 }}
      onClick={onLogin}
    >
      Sign In
    </button>
    <button
      className="btn-primary"
      style={{ padding: "9px 22px", fontSize: 14 }}
      onClick={onSignup}
    >
      Get Started <Icon.arrow />
    </button>
  </div>
);