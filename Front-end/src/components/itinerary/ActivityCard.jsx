import { useState } from "react";
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

export default function ActivityCard({ activity, dayIndex, activityIndex, isExpanded, onToggle }) {
  const style = activityTypeStyles[activity.type] || activityTypeStyles.activity;

  return (
    <div style={{ position: "relative", marginBottom: 20 }}>
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
        className="card"
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
              padding: 8,
              borderRadius: 8,
              color: style.color,
              flexShrink: 0,
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
                gap: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    color: C.midGray,
                    marginBottom: 3,
                  }}
                >
                  {activity.time}
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    lineHeight: 1.3,
                  }}
                >
                  {activity.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: C.midGray,
                    marginTop: 3,
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
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {activity.cost && (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.offWhite,
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
            </div>
          </div>
        </div>

        {isExpanded && (activity.tips || activity.cuisine || activity.why) && (
          <div
            style={{
              padding: "0 20px 16px 20px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ paddingTop: 12 }}>
              {activity.tips && (
                <div
                  style={{
                    fontSize: 13,
                    color: C.midGray,
                    lineHeight: 1.7,
                  }}
                >
                  <span
                    style={{
                      color: C.crimson,
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
                    color: C.midGray,
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
                    color: C.midGray,
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
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 10,
                  fontSize: 12,
                  color: C.crimson,
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