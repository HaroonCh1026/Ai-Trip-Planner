import { C } from "../../styles/colors";

export default function TripProgress({ currentQ, totalQuestions, generating }) {
  // Guard against undefined values
  if (generating) return null;
  if (!totalQuestions || totalQuestions === 0) return null;
  
  const current = Math.min(currentQ + 1, totalQuestions);
  const percent = Math.round((currentQ / totalQuestions) * 100);

  return (
    <div
      style={{
        padding: "12px 5%",
        background: C.darkGray,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: C.midGray,
            marginBottom: 6,
          }}
        >
          <span>
            Phase {current} of {totalQuestions}
          </span>
          <span>
            {percent}% analyzed
          </span>
        </div>
        <div
          style={{
            height: 4,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background: `linear-gradient(to right, ${C.crimsonDark}, ${C.crimson})`,
              width: `${percent}%`,
              borderRadius: 2,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>
    </div>
  );
}