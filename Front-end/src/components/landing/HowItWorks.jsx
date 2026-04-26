import React from "react";
import { C } from "../../styles/colors";

export default function HowItWorks() {
  const steps = [
    { step: "01", title: "Create Account", desc: "Sign up in seconds with Google or email." },
    { step: "02", title: "Chat with AI", desc: "Answer a few questions about your trip via chatbot." },
    { step: "03", title: "Get Your Plan", desc: "Receive a complete day-by-day itinerary instantly." },
    { step: "04", title: "Explore & Go", desc: "View maps, save your trip, and start your adventure." },
  ];

  return (
    <section style={{ padding: "100px 5%", background: C.darkGray, borderTop: `1px solid rgba(140,50,50,0.15)` }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div className="section-label">Simple Process</div>
          <h2 className="display-heading" style={{ fontSize: "clamp(32px, 5vw, 52px)" }}>How It Works</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32 }}>
          {steps.map((step) => (
            <div key={step.step} style={{ textAlign: "center", padding: "32px 24px" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", border: `2px solid ${C.crimson}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontFamily: "'DM Mono', monospace", fontSize: 15, color: C.crimson }}>
                {step.step}
              </div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 10 }}>{step.title}</h3>
              <p style={{ color: C.midGray, fontSize: 14, lineHeight: 1.7 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}