import React from "react";
import { C } from "../../styles/colors";
import { Icon } from "../Icon";
import { FEATURES } from "../../constants/data";

export default function FeaturesSection() {
  return (
    <section style={{ padding: "100px 5%", background: C.nearBlack }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div className="section-label">Everything You Need</div>
          <h2 className="display-heading" style={{ fontSize: "clamp(32px, 5vw, 52px)" }}>
            Features Built for
            <br />
            <span style={{ color: C.crimson }}>Real Travelers</span>
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {FEATURES.map((feature) => (
            <div key={feature.title} className="card hover-lift" style={{ padding: "32px 28px" }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>
                {Icon[feature.icon] ? React.createElement(Icon[feature.icon], { width: "32", height: "32" }) : <Icon.plane width="32" height="32" />}
              </div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, marginBottom: 10 }}>{feature.title}</h3>
              <p style={{ color: C.midGray, fontSize: 14, lineHeight: 1.75 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}