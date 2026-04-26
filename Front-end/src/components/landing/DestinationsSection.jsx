import React from "react";
import { C } from "../../styles/colors";
import { DESTINATIONS } from "../../constants/data";

export default function DestinationsSection({ onSignup }) {
  return (
    <section style={{ padding: "100px 5%", background: C.darkGray }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div className="section-label">Popular Destinations</div>
          <h2 className="display-heading" style={{ fontSize: "clamp(32px, 5vw, 52px)" }}>Where Will You Go?</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {DESTINATIONS.map((destination) => (
            <DestinationCard key={destination.name} destination={destination} onSignup={onSignup} />
          ))}
        </div>
      </div>
    </section>
  );
}

const DestinationCard = ({ destination, onSignup }) => (
  <div className="hover-lift" style={{ borderRadius: 12, overflow: "hidden", position: "relative", height: 240, cursor: "pointer" }} onClick={onSignup}>
    <img
      src={destination.img}
      alt={destination.name}
      style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }}
      onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80"; }}
      onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
      onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
    />
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,13,13,0.9) 0%, transparent 55%)" }} />
    <div style={{ position: "absolute", bottom: 20, left: 20, right: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600 }}>{destination.name}</div>
          <div style={{ fontSize: 12, color: C.midGray, marginTop: 2 }}>Plan your trip →</div>
        </div>
        <div style={{ background: C.crimson, borderRadius: 4, padding: "4px 10px", fontSize: 12 }}>Popular</div>
      </div>
    </div>
  </div>
);