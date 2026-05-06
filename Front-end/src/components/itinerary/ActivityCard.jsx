import { C } from "../../styles/colors";
import { Icon } from "../Icon";

const activityTypeStyles = {
  activity: {
    bg: "rgba(140,50,50,0.15)",
    color: C.crimson,
    icon: <Icon.activity />,
  },
  restaurant: {
    bg: "rgba(50,100,200,0.15)",
    color: "#5B9EFF",
    icon: <Icon.fork />,
  },
  hotel: {
    bg: "rgba(50,180,50,0.15)",
    color: "#5CCC5C",
    icon: <Icon.hotel />,
  },
  // ✅ Add these new types
  dining: {
    bg: "rgba(50,100,200,0.15)",
    color: "#5B9EFF",
    icon: <Icon.fork />,
  },
  leisure: {
    bg: "rgba(140,50,50,0.15)",
    color: C.crimson,
    icon: <Icon.activity />,
  },
  transport: {
    bg: "rgba(200,180,50,0.15)",
    color: "#E6B800",
    icon: <Icon.plane />,
  },
};

// Chevron — small inline SVG so we don't need to extend the Icon component.
function Chevron({ open }) {
  return (
    <svg
      className={`vai-chevron ${open ? "vai-chevron-open" : ""}`}
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ActivityCard({ activity, dayIndex, activityIndex, isExpanded, onToggle }) {
  const style = activityTypeStyles[activity.type] || activityTypeStyles.activity;
  const hasDetails = !!(activity.tips || activity.cuisine || activity.why);

  return (
    <div style={{ position: "relative", marginBottom: 18 }}>
      {/* Dot */}
      <div
        style={{
          position: "absolute",
          left: -36,
          top: 18,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: style.bg,
          border: `2px solid ${style.color}`,
        }}
      />

      <div
        className="card vai-focusable"
        role="button"
        tabIndex={0}
        aria-expanded={hasDetails ? isExpanded : undefined}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        style={{ cursor: "pointer" }}
        onClick={onToggle}
      >
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div
            style={{
              background: style.bg,
              padding: 9,
              borderRadius: 8,
              color: style.color,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {style.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    color: C.midGray,
                    marginBottom: 4,
                    letterSpacing: "0.04em",
                  }}
                >
                  {activity.time}
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    lineHeight: 1.35,
                    color: C.offWhite,
                  }}
                >
                  {activity.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: C.midGray,
                    marginTop: 4,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Icon.location /> {activity.location}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <div style={{ textAlign: "right" }}>
                  {activity.cost && (
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: C.offWhite,
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      PKR {activity.cost}
                    </div>
                  )}
                  {activity.duration && (
                    <div
                      style={{
                        fontSize: 11,
                        color: C.midGray,
                      }}
                    >
                      {activity.duration}
                    </div>
                  )}
                </div>
                {hasDetails && <Chevron open={isExpanded} />}
              </div>
            </div>
          </div>
        </div>

        {isExpanded && hasDetails && (
          <div
            style={{
              padding: "0 20px 16px 20px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ paddingTop: 14 }}>
              {activity.tips && (
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(232,232,232,0.85)",
                    lineHeight: 1.7,
                  }}
                >
                  <span
                    style={{
                      color: C.crimsonLight,
                      fontWeight: 600,
                    }}
                  >
                    Tip:{" "}
                  </span>
                  {activity.tips}
                </div>
              )}
              {activity.cuisine && (
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(232,232,232,0.85)",
                    lineHeight: 1.7,
                    marginTop: 6,
                  }}
                >
                  <span
                    style={{
                      color: "#5B9EFF",
                      fontWeight: 600,
                    }}
                  >
                    Cuisine:{" "}
                  </span>
                  {activity.cuisine}
                </div>
              )}
              {activity.why && (
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(232,232,232,0.85)",
                    lineHeight: 1.7,
                    marginTop: 6,
                  }}
                >
                  <span
                    style={{
                      color: "#5CCC5C",
                      fontWeight: 600,
                    }}
                  >
                    Why stay:{" "}
                  </span>
                  {activity.why}
                </div>
              )}
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(activity.name + " " + activity.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="vai-focusable"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 12,
                  fontSize: 12,
                  color: C.crimsonLight,
                  textDecoration: "none",
                  fontWeight: 500,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Icon.map /> View on Google Maps
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}