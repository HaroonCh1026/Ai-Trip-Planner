import { C } from "../../styles/colors";
import { Icon } from "../Icon";

export default function AuthHeader() {
  return (
    <div style={{ textAlign: "center", marginBottom: 40 }}>
      <div
        style={{
          width: 52,
          height: 52,
          background: C.crimson,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        <Icon.plane />
      </div>
      <div
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        <span style={{ color: C.crimson }}>AI</span> Trip Planner
      </div>
    </div>
  );
}