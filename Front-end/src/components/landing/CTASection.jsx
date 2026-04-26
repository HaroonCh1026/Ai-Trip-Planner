import React from "react";
import { C } from "../../styles/colors";
import { Icon } from "../Icon";

export default function CTASection({ onSignup }) {
  return (
    <section style={{ padding: "100px 5%", textAlign: "center", background: `linear-gradient(135deg, ${C.nearBlack} 0%, rgba(140,50,50,0.12) 50%, ${C.nearBlack} 100%)` }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="section-label">Ready to Explore?</div>
        <h2 className="display-heading" style={{ fontSize: "clamp(32px, 5vw, 56px)", marginBottom: 20 }}>
          Your Next Adventure
          <br />
          Starts Here
        </h2>
        <p style={{ color: C.midGray, fontSize: 17, marginBottom: 40 }}>
          Join thousands of travelers who plan smarter with AI.
        </p>
        <button className="btn-primary" style={{ fontSize: 17, padding: "18px 44px" }} onClick={onSignup}>
          <Icon.sparkle /> Create Your First Trip — Free
        </button>
      </div>
    </section>
  );
}