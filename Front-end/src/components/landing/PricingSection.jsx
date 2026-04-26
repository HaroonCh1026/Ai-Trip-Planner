import React from "react";
import { C } from "../../styles/colors";
import { Icon } from "../Icon";

export default function PricingSection({ onSignup }) {
  const plans = [
    {
      name: "Free",
      price: "PKR 0",
      period: "forever",
      features: ["5 AI itineraries", "Day-by-day planning", "Hotel suggestions", "Google Maps integration", "Trip history", "PKR budgeting"],
      cta: "Get Started",
      highlight: false,
    },
    {
      name: "Pro",
      price: "PKR 2,500",
      period: "per month",
      features: ["Unlimited itineraries", "Everything in Free", "Priority AI generation", "PDF export", "Advanced customization", "WhatsApp support", "Offline access"],
      cta: "Start Pro",
      highlight: true,
    },
  ];

  return (
    <section id="pricing" style={{ padding: "100px 5%", background: C.darkGray }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div className="section-label">Simple Pricing</div>
          <h2 className="display-heading" style={{ fontSize: "clamp(32px, 5vw, 52px)" }}>Start Free, Travel More</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
          {plans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} onSignup={onSignup} />
          ))}
        </div>
      </div>
    </section>
  );
}

const PlanCard = ({ plan, onSignup }) => (
  <div
    className={plan.highlight ? "" : "card"}
    style={{
      padding: "40px 32px",
      borderRadius: 12,
      background: plan.highlight ? `linear-gradient(135deg, ${C.crimsonDark}, ${C.crimson})` : undefined,
      border: plan.highlight ? "none" : undefined,
      position: "relative",
    }}
  >
    {plan.highlight && (
      <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: C.offWhite, color: C.nearBlack, fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 12, letterSpacing: "0.08em" }}>
        MOST POPULAR
      </div>
    )}
    
    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, marginBottom: 4 }}>{plan.name}</div>
    
    <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
      <span style={{ fontSize: 42, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{plan.price}</span>
      <span style={{ color: plan.highlight ? "rgba(255,255,255,0.7)" : C.midGray, fontSize: 14 }}>/{plan.period}</span>
    </div>
    
    <div style={{ height: 1, background: plan.highlight ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)", margin: "24px 0" }} />
    
    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
      {plan.features.map((feature) => (
        <li key={feature} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14, color: plan.highlight ? "rgba(255,255,255,0.9)" : C.offWhite }}>
          <Icon.check /> {feature}
        </li>
      ))}
    </ul>
    
    <button
      onClick={onSignup}
      style={{
        width: "100%",
        padding: "14px",
        borderRadius: 6,
        border: "none",
        cursor: "pointer",
        background: plan.highlight ? C.offWhite : C.crimson,
        color: plan.highlight ? C.crimson : C.white,
        fontWeight: 700,
        fontSize: 15,
        fontFamily: "'DM Sans', sans-serif",
        transition: "opacity 0.2s",
      }}
      onMouseEnter={(e) => (e.target.style.opacity = "0.88")}
      onMouseLeave={(e) => (e.target.style.opacity = "1")}
    >
      {plan.cta}
    </button>
  </div>
);