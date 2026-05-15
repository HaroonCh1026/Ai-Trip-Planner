import React from "react";
import { C } from "../../styles/colors";

export default function AboutSection() {
  const stats = [
    { value: "150+", label: "Pakistani Regions Mapped" },
    { value: "98%", label: "Itinerary Accuracy Rate" },
  ];

  return (
    <section id="about" style={{ padding: "100px 5%", background: C.darkGray }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 60, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 400px" }}>
          <div className="section-label">Institutional Overview</div>
          <h2 className="display-heading" style={{ fontSize: "clamp(32px, 5vw, 48px)", marginBottom: 24 }}>
            The Future of Travel
            <br />
            Architecture
          </h2>
          <p style={{ color: C.midGray, fontSize: 16, lineHeight: 1.8, marginBottom: 24 }}>
           Founded in Lahore, AI Trip Planner is a specialized travel intelligence firm dedicated to decoding the logistical complexities of Pakistan. 
            We combine state-of-the-art Google Gemini AI with deep local knowledge to architect experiences that are not only breathtaking but strategically sound.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {stats.map((stat) => (
              <div key={stat.label}>
                <div style={{ fontSize: 24, fontWeight: 700, color: C.crimson, marginBottom: 4 }}>{stat.value}</div>
                <div style={{ fontSize: 13, color: C.midGray }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ flex: "1 1 400px", position: "relative" }}>
          <img
            src="https://images.unsplash.com/photo-1586348943529-beaae6c28db9?auto=format&fit=crop&w=800&q=80"
            alt="Northern Pakistan Mountains"
            onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1519955266818-0231b63cd0d8?auto=format&fit=crop&w=800&q=80"; }}
            style={{ width: "100%", borderRadius: 12, boxShadow: "0 40px 100px rgba(0,0,0,0.5)", display: "block" }}
          />
          <div style={{ position: "absolute", bottom: -20, left: -20, background: C.crimson, padding: "20px 30px", borderRadius: 8, boxShadow: "0 20px 40px rgba(140,50,50,0.3)" }}>
            <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.15em", color: "rgba(255,255,255,0.7)" }}>FOUNDED</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Lahore, Pakistan</div>
          </div>
          <div style={{ position: "absolute", top: 20, right: 20, background: "rgba(13,13,13,0.85)", backdropFilter: "blur(8px)", padding: "12px 16px", borderRadius: 8, border: "1px solid rgba(140,50,50,0.3)" }}>
            <div style={{ fontSize: 11, color: C.midGray }}>Powered by</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.crimson }}>Google Gemini AI</div>
          </div>
        </div>
      </div>
    </section>
  );
}