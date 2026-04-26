import { C } from "../../styles/colors";
import { Icon } from "../Icon";

export default function GenerationLoader({ genSteps, genStep }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
      <div
        style={{
          width: 36,
          height: 36,
          background: C.crimson,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon.sparkle />
      </div>
      <div className="card" style={{ padding: "20px 24px", maxWidth: 400 }}>
        <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>
          Initializing algorithmic generation...
        </div>
        {genSteps.map((step, i) => (
          <div
            key={step}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
              opacity: i <= genStep ? 1 : 0.3,
              transition: "opacity 0.4s",
            }}
          >
            {i < genStep ? (
              <div
                style={{
                  width: 18,
                  height: 18,
                  background: "rgba(50,180,50,0.2)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon.check />
              </div>
            ) : i === genStep ? (
              <div
                style={{
                  width: 18,
                  height: 18,
                  border: `2px solid ${C.crimson}`,
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 18,
                  height: 18,
                  border: "2px solid rgba(255,255,255,0.15)",
                  borderRadius: "50%",
                  flexShrink: 0,
                }}
              />
            )}
            <span style={{ fontSize: 13 }}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}