import { C } from "../../styles/colors";
import { Icon } from "../Icon";

export default function TripHeader({ onBack }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: `rgba(13,13,13,0.95)`,
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid rgba(140,50,50,0.2)`,
        padding: "0 5%",
        height: 68,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <button
        onClick={onBack}
        style={{
          background: "transparent",
          border: "none",
          color: C.midGray,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <Icon.arrowLeft /> Dashboard
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            background: C.crimson,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon.sparkle />
        </div>
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 17,
            fontWeight: 600,
          }}
        >
          Strategic Planner
        </span>
      </div>
      <div style={{ width: 80 }} />
    </div>
  );
}