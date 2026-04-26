import React from "react";
import { C } from "../../styles/colors";
import { Icon } from "../Icon";

export default function Footer() {
  const footerSections = {
    PRODUCT: ["Features", "Pricing", "How it Works", "Blog"],
    COMPANY: ["About Us", "Contact", "Privacy", "Terms"],
  };

  return (
    <footer
      id="support"
      style={{
        padding: "60px 5% 30px",
        borderTop: `1px solid rgba(140,50,50,0.2)`,
        background: "#080808",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 40,
            marginBottom: 48,
            flexWrap: "wrap",
          }}
        >
          <FooterBrand />
          <FooterSection title="PRODUCT" items={footerSections.PRODUCT} />
          <FooterSection title="COMPANY" items={footerSections.COMPANY} />
          <FooterContact />
        </div>
        <FooterBottom />
      </div>
    </footer>
  );
}

const FooterBrand = () => (
  <div>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div
        style={{
          width: 28,
          height: 28,
          background: C.crimson,
          borderRadius: 5,
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
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        Voyageur<span style={{ color: C.crimson }}>AI</span>
      </span>
    </div>
    <p
      style={{
        color: C.midGray,
        fontSize: 14,
        lineHeight: 1.8,
        maxWidth: 260,
      }}
    >
      Pakistan's first AI-powered travel intelligence platform, architecting premium experiences for the modern traveler.
    </p>
  </div>
);

const FooterSection = ({ title, items }) => (
  <div>
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.12em",
        color: C.offWhite,
        marginBottom: 16,
      }}
    >
      {title}
    </div>
    {items.map((item) => (
      <div
        key={item}
        style={{
          color: C.midGray,
          fontSize: 14,
          marginBottom: 10,
          cursor: "pointer",
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) => (e.target.style.color = C.offWhite)}
        onMouseLeave={(e) => (e.target.style.color = C.midGray)}
      >
        {item}
      </div>
    ))}
  </div>
);

const FooterContact = () => (
  <div>
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.12em",
        color: C.offWhite,
        marginBottom: 16,
      }}
    >
      CONTACT
    </div>
    <div style={{ color: C.midGray, fontSize: 13, marginBottom: 8 }}>
      info@voyageur.pk
    </div>
    <div style={{ color: C.midGray, fontSize: 13, marginBottom: 8 }}>
      +92 42 1234 5678
    </div>
    <div style={{ color: C.midGray, fontSize: 13 }}>
      Lahore, Punjab, Pakistan
    </div>
  </div>
);

const FooterBottom = () => (
  <>
    <div
      style={{
        height: 1,
        background: "rgba(255,255,255,0.06)",
        marginBottom: 24,
      }}
    />
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div style={{ color: C.midGray, fontSize: 12 }}>
        © 2025 VoyageurAI. All rights reserved. Built for IUB CS Project by Haroon Riaz.
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {["Privacy", "Terms", "Cookies"].map((item) => (
          <span
            key={item}
            style={{
              color: C.midGray,
              fontSize: 12,
              cursor: "pointer",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.color = C.crimson)}
            onMouseLeave={(e) => (e.target.style.color = C.midGray)}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  </>
);