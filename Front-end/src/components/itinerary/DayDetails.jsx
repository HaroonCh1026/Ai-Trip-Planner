import { useState } from "react";
import { C } from "../../styles/colors";
import ActivityCard from "./ActivityCard";
import HotelCard from "./HotelCard";

export default function DayDetails({ currentDay, activeDay }) {
  const [expandedActivity, setExpandedActivity] = useState(null);

  if (!currentDay) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px 0",
          color: C.midGray,
        }}
      >
        Select a day from the left
      </div>
    );
  }

  // Safely get day number
  const getDayNumber = () => {
    if (currentDay.day && typeof currentDay.day === 'number') return currentDay.day;
    if (currentDay.day && typeof currentDay.day === 'object') return currentDay.day.number || activeDay + 1;
    return activeDay + 1;
  };

  // Safely get title
  const getTitle = () => {
    if (currentDay.title && typeof currentDay.title === 'string') return currentDay.title;
    if (currentDay.title && typeof currentDay.title === 'object') return currentDay.title.heading || `Day ${getDayNumber()}`;
    return `Day ${getDayNumber()}`;
  };

  // Safely get daily cost
  const getDailyCost = () => {
    if (currentDay.dailyCost && typeof currentDay.dailyCost === 'number') return currentDay.dailyCost;
    if (currentDay.dailyCost && typeof currentDay.dailyCost === 'object') return currentDay.dailyCost.amount || 0;
    return 0;
  };

  // Safely get activities array
  const getActivities = () => {
    if (Array.isArray(currentDay.activities)) return currentDay.activities;
    if (currentDay.activities && typeof currentDay.activities === 'object') return Object.values(currentDay.activities);
    return [];
  };

  const activities = getActivities();
  const dailyCost = getDailyCost();

  return (
    <div className="anim-fadeIn">
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11,
            color: C.crimsonLight,
            letterSpacing: "0.18em",
            marginBottom: 6,
            textTransform: "uppercase",
          }}
        >
          Day {getDayNumber()}
        </div>
        <h2
          className="display-heading"
          style={{ fontSize: "clamp(22px, 3vw, 28px)", lineHeight: 1.2 }}
        >
          {getTitle()}
        </h2>
        {dailyCost > 0 && (
          <div
            style={{
              color: C.midGray,
              fontSize: 13,
              marginTop: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            Estimated daily cost:{" "}
            <span
              style={{
                color: C.offWhite,
                fontWeight: 600,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              PKR {dailyCost}
            </span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="vai-day-content-indent" style={{ position: "relative", paddingLeft: 36 }}>
        <div
          style={{
            position: "absolute",
            left: 7,
            top: 0,
            bottom: 0,
            width: 2,
            background:
              "linear-gradient(to bottom, rgba(140,50,50,0.35) 0%, rgba(140,50,50,0.1) 100%)",
          }}
        />

        {activities.map((activity, i) => {
          const isExpanded = expandedActivity === `${activeDay}-${i}`;
          return (
            <ActivityCard
              key={`${activity?.name || i}-${i}`}
              activity={activity}
              dayIndex={activeDay}
              activityIndex={i}
              isExpanded={isExpanded}
              onToggle={() =>
                setExpandedActivity(isExpanded ? null : `${activeDay}-${i}`)
              }
            />
          );
        })}
      </div>

      {/* Hotel Card */}
      {currentDay.hotel && <HotelCard hotel={currentDay.hotel} />}
    </div>
  );
}