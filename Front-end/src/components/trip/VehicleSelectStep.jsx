import { useState } from "react";
import { C } from "../../styles/colors";
import { Icon } from "../Icon";
import {
  VEHICLES,
  GROUP_SIZE_OPTIONS,
  recommendForProfile,
  groupSizeToProfile,
} from "../../constants/vehicles";

/**
 * VehicleSelectStep — special chatbot step for choosing transport mode.
 *
 * Renders inline in the chat conversation (NOT inside ChatInput). Two-stage:
 *   1. User picks group size via chips (1, 2, family, group)
 *   2. The vehicle list re-orders to highlight options recommended for that
 *      group profile, and the user picks one card
 *
 * On submit, calls `onSubmit({ vehicleId, groupSize })` so the parent
 * (TripCreator) can store both answers in one go and advance to the next
 * question without showing a duplicate "what's your group size?" dialog.
 *
 * This component does NOT render its own bot-bubble header — TripCreator
 * adds the bot question text into the chat history before mounting this step,
 * keeping the chat flow visually consistent.
 */
export default function VehicleSelectStep({ onSubmit, defaultGroupSize = 2 }) {
  const [groupSize, setGroupSize] = useState(defaultGroupSize);
  const [vehicleId, setVehicleId] = useState(null);

  const profile = groupSizeToProfile(groupSize);
  const orderedVehicles = recommendForProfile(profile);

  const canSubmit = !!vehicleId;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({ vehicleId, groupSize });
  };

  return (
    <div
      className="anim-fadeIn"
      style={{
        padding: "20px 0",
        marginBottom: 8,
      }}
    >
      {/* ── Group size chips ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <p
          className="section-label"
          style={{ fontSize: 11, color: C.midGray, marginBottom: 10, letterSpacing: "0.1em" }}
        >
          1. How many travelers?
        </p>
        <div
          role="radiogroup"
          aria-label="Group size"
          style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
        >
          {GROUP_SIZE_OPTIONS.map((opt) => {
            const active = groupSize === opt.value;
            return (
              <button
                key={opt.value}
                role="radio"
                aria-checked={active}
                onClick={() => {
                  setGroupSize(opt.value);
                  // Reset vehicle pick when group size changes — a sedan that
                  // made sense for solo doesn't make sense for a family of 5.
                  setVehicleId(null);
                }}
                style={{
                  padding: "8px 16px",
                  background: active ? C.crimson : "transparent",
                  border: `1px solid ${active ? C.crimson : "rgba(255,255,255,0.12)"}`,
                  borderRadius: 6,
                  color: active ? "#fff" : C.offWhite,
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Vehicle cards ─────────────────────────────────────────────────── */}
      <div>
        <p
          className="section-label"
          style={{ fontSize: 11, color: C.midGray, marginBottom: 10, letterSpacing: "0.1em" }}
        >
          2. Pick your transport
        </p>
        <div
          role="radiogroup"
          aria-label="Vehicle option"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 10,
          }}
        >
          {orderedVehicles.map((v) => {
            const isRecommended = v.recommendedFor.includes(profile);
            const active = vehicleId === v.id;
            const tooSmall = v.capacity < groupSize && v.id !== "flight_economy" && !v.id.includes("shared") && !v.id.startsWith("daewoo");
            return (
              <button
                key={v.id}
                role="radio"
                aria-checked={active}
                disabled={tooSmall}
                onClick={() => setVehicleId(v.id)}
                style={{
                  padding: "14px 16px",
                  textAlign: "left",
                  background: active ? "rgba(140,50,50,0.18)" : "rgba(255,255,255,0.025)",
                  border: `1px solid ${active ? C.crimson : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 8,
                  cursor: tooSmall ? "not-allowed" : "pointer",
                  opacity: tooSmall ? 0.4 : 1,
                  fontFamily: "'DM Sans', sans-serif",
                  position: "relative",
                  transition: "all 0.15s",
                }}
                title={tooSmall ? `Capacity ${v.capacity} is too small for your group size` : undefined}
              >
                {/* "Recommended" badge */}
                {isRecommended && !tooSmall && (
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      fontSize: 9,
                      padding: "2px 6px",
                      background: "rgba(0,180,140,0.15)",
                      color: "rgb(120,220,180)",
                      borderRadius: 3,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    Recommended
                  </span>
                )}

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span aria-hidden="true" style={{ fontSize: 22 }}>
                    {v.icon}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.offWhite }}>
                    {v.label}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: "rgba(232,232,232,0.75)", marginBottom: 6, lineHeight: 1.5 }}>
                  {v.description}
                </div>
                <div style={{ fontSize: 11, color: C.midGray, lineHeight: 1.4 }}>
                  {v.note}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Submit ──────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <button
          className={canSubmit ? "btn-primary" : ""}
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label="Continue with selected vehicle"
          style={{
            padding: "12px 22px",
            fontSize: 13,
            opacity: canSubmit ? 1 : 0.4,
            cursor: canSubmit ? "pointer" : "not-allowed",
            background: canSubmit ? undefined : "rgba(255,255,255,0.06)",
            border: canSubmit ? undefined : "1px solid rgba(255,255,255,0.1)",
            color: canSubmit ? undefined : C.midGray,
            borderRadius: 6,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
          }}
        >
          <Icon.arrow /> Continue
        </button>
      </div>
    </div>
  );
}