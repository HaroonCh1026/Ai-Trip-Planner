import React from "react";
import { C } from "../../styles/colors";
import { Icon } from "../Icon";
import { DESTINATIONS } from "../../constants/data";

export default function HeroSection({ onLogin, onSignup }) {
  const stats = [
    ["5 Free Trips", "No credit card"],
    ["< 30 sec", "AI generation"],
    ["150+", "Pakistani regions"],
  ];

  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "120px 5% 80px",
        position: "relative",
        overflow: "hidden",
        background: `${C.nearBlack}`,
      }}
    >
      <HeroBackground />
      
      <div style={{ position: "relative", zIndex: 1, maxWidth: 860 }}>
        <div className="section-label anim-fadeUp anim-delay1">
          Intelligent Travel Integration
        </div>
        <h1 className="display-heading anim-fadeUp anim-delay2" style={{ fontSize: "clamp(44px, 8vw, 88px)", marginBottom: 24 }}>
          Strategic Planning,
          <br />
          <span
            style={{
              background: `linear-gradient(135deg, ${C.crimson}, #E05C5C, ${C.crimsonDark})`,
              backgroundSize: "200% 200%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "gradientShift 4s ease infinite",
            }}
          >
            Architected for Precision.
          </span>
        </h1>
        <p className="anim-fadeUp anim-delay3" style={{ fontSize: 18, color: C.midGray, maxWidth: 580, margin: "0 auto 40px", lineHeight: 1.8 }}>
          Utilize proprietary AI modeling to synchronize logistics, luxury accommodations, and local insights into one cohesive travel masterplan.
        </p>
        
        <HeroButtons onLogin={onLogin} onSignup={onSignup} />
        <HeroStats stats={stats} />
      </div>
      
      <FloatingDestinations />
    </section>
  );
}

const HeroBackground = () => (
  <>
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        backgroundImage: `url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1920&q=80')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: 0.25,
        filter: "grayscale(30%) contrast(110%)",
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(140,50,50,0.18) 0%, transparent 70%), linear-gradient(to bottom, transparent, ${C.nearBlack} 95%)`,
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        backgroundImage: `linear-gradient(rgba(140,50,50,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(140,50,50,0.06) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }}
    />
  </>
);

const HeroButtons = ({ onLogin, onSignup }) => (
  <div className="anim-fadeUp anim-delay4" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
    <button className="btn-primary" style={{ fontSize: 16, padding: "16px 36px" }} onClick={onSignup}>
      <Icon.sparkle /> Start Planning Free
    </button>
    <button className="btn-secondary" style={{ fontSize: 16, padding: "16px 36px" }} onClick={onLogin}>
      Sign In
    </button>
  </div>
);

const HeroStats = ({ stats }) => (
  <div className="anim-fadeUp anim-delay5" style={{ display: "flex", gap: 32, justifyContent: "center", marginTop: 48, flexWrap: "wrap" }}>
    {stats.map(([label, sublabel]) => (
      <div key={label} style={{ textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.offWhite, fontFamily: "'Playfair Display', serif" }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: C.midGray, marginTop: 2 }}>{sublabel}</div>
      </div>
    ))}
  </div>
);

const FloatingDestinations = () => (
  <div className="anim-fadeIn anim-delay5" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 960, width: "100%", marginTop: 80, position: "relative", zIndex: 1 }}>
    {DESTINATIONS.slice(0, 3).map((destination, index) => (
      <div
        key={destination.name}
        className="hover-lift"
        style={{
          borderRadius: 12,
          overflow: "hidden",
          position: "relative",
          height: 200,
          border: `1px solid rgba(140,50,50,0.2)`,
          animation: `float ${3.5 + index * 0.5}s ease-in-out infinite`,
          animationDelay: `${index * 0.4}s`,
        }}
      >
        <img src={destination.img} alt={destination.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,13,13,0.85) 0%, transparent 60%)" }} />
        <div style={{ position: "absolute", bottom: 16, left: 16 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600 }}>{destination.name}</div>
        </div>
      </div>
    ))}
  </div>
);