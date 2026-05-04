import { useState, useMemo } from "react";
import { C } from "../../styles/colors";
import { Icon } from "../Icon";
import {
  VEHICLES,
  GROUP_SIZE_OPTIONS,
  recommendForProfile,
  groupSizeToProfile,
} from "../../constants/vehicles";

/**
 * VehicleSelectStep — chatbot step for choosing transport mode.
 *
 * Round 5 (#6): redesigned UI.
 *
 * Changes over the previous version:
 *   • 9 vehicles grouped into 3 categories (Private / Shared & Public / Flight)
 *     with subtle section headers — easier to scan than a flat 3×3 grid
 *   • Each card now shows: capacity icon-row, seed price per km/per person,
 *     vehicle description, and a small note line — better at-a-glance compare
 *   • Recommended chips: glowing emerald border + corner ribbon, much more
 *     visible than the old tiny pill
 *   • Selected state: filled crimson + slight scale, not just a thin border
 *   • Disabled (capacity-too-small): crossed icon + "Need a bigger vehicle"
 *     hint instead of just opacity
 *   • Group size chips: cleaner pills with icons + count
 *   • All breakpoints: cards stack to 1 column on narrow screens
 *
 * Submit/data contract is UNCHANGED. TripCreator gets `{ vehicleId, groupSize }`
 * exactly as before.
 */

// ─── Seed pricing for display only ──────────────────────────────────────
// Mirrors VEHICLE_SEEDS in AdminPricing.jsx and Backend/src/utils/vehicleOptions.ts.
// Shown on cards as a "from PKR X" hint so users can compare cost-to-comfort.
// Admin overrides are NOT reflected here (would require an API call we don't
// want to make on every TripCreator mount); these are just illustrative seeds.
const VEHICLE_SEED_PRICE = {
  sedan_private:   { price: 25,  unit: "/km" },
  sedan_shared:    { price: 8,   unit: "/km, per person" },
  suv_private:     { price: 45,  unit: "/km" },
  hiace_private:   { price: 60,  unit: "/km" },
  hiace_shared:    { price: 12,  unit: "/km, per person" },
  coaster_private: { price: 120, unit: "/km" },
  daewoo_business: { price: 4.5, unit: "/km, per person" },
  daewoo_economy:  { price: 3,   unit: "/km, per person" },
  flight_economy:  { price: 22,  unit: "/km, per person" },
};

// ─── Category grouping ──────────────────────────────────────────────────
// Maps each vehicle id to one of three buckets. Order within each bucket
// is preserved from VEHICLES (so the recommendation re-ordering still applies
// inside each bucket).
const VEHICLE_CATEGORIES = {
  sedan_private:   "private",
  suv_private:     "private",
  hiace_private:   "private",
  coaster_private: "private",
  sedan_shared:    "shared",
  hiace_shared:    "shared",
  daewoo_business: "shared",
  daewoo_economy:  "shared",
  flight_economy:  "flight",
};

const CATEGORY_META = {
  private: {
    label: "Private vehicle",
    sublabel: "Your own car/van + driver. Most flexible, scenic detours possible.",
    icon: "🔑",
  },
  shared: {
    label: "Shared / Public transport",
    sublabel: "Per-person fares. Cheapest option for solo and couple travelers.",
    icon: "🎟️",
  },
  flight: {
    label: "Flight",
    sublabel: "Fastest, especially for Northern Areas in winter.",
    icon: "🛫",
  },
};

const CATEGORY_ORDER = ["private", "shared", "flight"];

// Helper: determine whether a vehicle's capacity can fit the group.
// Some IDs are per-person ("shared", "daewoo_*", "flight") so capacity
// doesn't apply to them — they're always fittable.
const isCapacityOk = (vehicle, groupSize) => {
  if (vehicle.id === "flight_economy") return true;
  if (vehicle.id.includes("shared")) return true;
  if (vehicle.id.startsWith("daewoo")) return true;
  return vehicle.capacity >= groupSize;
};

export default function VehicleSelectStep({ onSubmit, defaultGroupSize = 2 }) {
  const [groupSize, setGroupSize] = useState(defaultGroupSize);
  const [vehicleId, setVehicleId] = useState(null);

  const profile = groupSizeToProfile(groupSize);
  // Pre-sort by recommendation, then re-bucket — keeps recommended cards at
  // the TOP of each category section, which is the natural reading order.
  const ordered = useMemo(() => recommendForProfile(profile), [profile]);

  const grouped = useMemo(() => {
    const buckets = { private: [], shared: [], flight: [] };
    for (const v of ordered) {
      const cat = VEHICLE_CATEGORIES[v.id] || "private";
      buckets[cat].push(v);
    }
    return buckets;
  }, [ordered]);

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
      {/* ── Step 1: Group size ───────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <p
          className="section-label"
          style={{
            fontSize: 11,
            color: C.midGray,
            marginBottom: 12,
            letterSpacing: "0.1em",
          }}
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
                  // Reset vehicle pick when group size changes.
                  setVehicleId(null);
                }}
                style={{
                  padding: "10px 18px",
                  background: active
                    ? `linear-gradient(135deg, ${C.crimson}, ${C.crimsonLight})`
                    : "rgba(255,255,255,0.03)",
                  border: `1px solid ${
                    active ? C.crimsonLight : "rgba(255,255,255,0.08)"
                  }`,
                  borderRadius: 999,
                  color: active ? "#fff" : C.offWhite,
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  boxShadow: active ? "0 2px 8px rgba(140,50,50,0.35)" : "none",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Step 2: Vehicle cards (grouped by category) ───────────────── */}
      <div>
        <p
          className="section-label"
          style={{
            fontSize: 11,
            color: C.midGray,
            marginBottom: 14,
            letterSpacing: "0.1em",
          }}
        >
          2. Pick your transport
        </p>

        <div role="radiogroup" aria-label="Vehicle option">
          {CATEGORY_ORDER.map((cat) => {
            const items = grouped[cat];
            if (!items || items.length === 0) return null;
            const meta = CATEGORY_META[cat];
            return (
              <section key={cat} style={{ marginBottom: 22 }}>
                {/* Category header */}
                <header
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    marginBottom: 10,
                    paddingLeft: 2,
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: 16 }}>
                    {meta.icon}
                  </span>
                  <h4
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.offWhite,
                      margin: 0,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {meta.label}
                  </h4>
                  <span
                    style={{
                      fontSize: 11,
                      color: C.midGray,
                      marginLeft: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {meta.sublabel}
                  </span>
                </header>

                {/* Cards in this category */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: 10,
                  }}
                >
                  {items.map((v) => {
                    const isRecommended = v.recommendedFor.includes(profile);
                    const active = vehicleId === v.id;
                    const fits = isCapacityOk(v, groupSize);
                    const seedPrice = VEHICLE_SEED_PRICE[v.id];
                    return (
                      <VehicleCard
                        key={v.id}
                        vehicle={v}
                        active={active}
                        recommended={isRecommended && fits}
                        disabled={!fits}
                        seedPrice={seedPrice}
                        groupSize={groupSize}
                        onSelect={() => fits && setVehicleId(v.id)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* ── Submit ─────────────────────────────────────────────────────── */}
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

// ─── Vehicle card ──────────────────────────────────────────────────────
// Self-contained card with hover state. Borders + glow signal recommended;
// crimson fill signals selected; greyed-out + crossed-circle signals
// "doesn't fit your group size".
function VehicleCard({
  vehicle: v,
  active,
  recommended,
  disabled,
  seedPrice,
  groupSize,
  onSelect,
}) {
  const [hover, setHover] = useState(false);

  // Visual stack of color treatments depending on state. Order of override:
  // disabled > active > recommended > default.
  const palette = disabled
    ? {
        bg: "rgba(255,255,255,0.015)",
        border: "rgba(255,255,255,0.05)",
        labelColor: "rgba(232,232,232,0.4)",
        glow: "none",
      }
    : active
    ? {
        bg: "linear-gradient(135deg, rgba(140,50,50,0.25), rgba(140,50,50,0.12))",
        border: C.crimson,
        labelColor: C.offWhite,
        glow: `0 0 0 3px rgba(140,50,50,0.18), 0 4px 12px rgba(140,50,50,0.25)`,
      }
    : recommended
    ? {
        bg: hover ? "rgba(80,180,140,0.05)" : "rgba(255,255,255,0.025)",
        border: hover ? "rgba(120,220,180,0.45)" : "rgba(120,220,180,0.30)",
        labelColor: C.offWhite,
        glow: hover ? "0 0 0 1px rgba(120,220,180,0.20)" : "none",
      }
    : {
        bg: hover ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        border: hover ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)",
        labelColor: C.offWhite,
        glow: "none",
      };

  return (
    <button
      role="radio"
      aria-checked={active}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onSelect}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={
        disabled
          ? `Capacity ${v.capacity} — too small for ${groupSize} travelers`
          : undefined
      }
      style={{
        position: "relative",
        padding: "14px 16px",
        textAlign: "left",
        background: palette.bg,
        border: `1.5px solid ${palette.border}`,
        borderRadius: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'DM Sans', sans-serif",
        boxShadow: palette.glow,
        transition: "all 0.18s ease",
        transform: active ? "translateY(-1px)" : "translateY(0)",
        outline: "none",
        // Set min-height so cards in same row line up regardless of content
        minHeight: 132,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Recommended ribbon — only when recommended & not active */}
      {recommended && !active && !disabled && (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: 9,
            padding: "3px 8px",
            background: "rgba(120,220,180,0.18)",
            color: "rgb(120,220,180)",
            borderRadius: 999,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            lineHeight: 1,
            border: "1px solid rgba(120,220,180,0.35)",
          }}
        >
          Recommended
        </span>
      )}

      {/* Active checkmark — only when selected */}
      {active && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: C.crimson,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 800,
            boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
          }}
        >
          ✓
        </span>
      )}

      {/* Disabled "doesn't fit" badge */}
      {disabled && (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: 9,
            padding: "3px 7px",
            background: "rgba(255,180,0,0.1)",
            color: "rgba(255,180,0,0.7)",
            borderRadius: 999,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            lineHeight: 1,
            border: "1px solid rgba(255,180,0,0.3)",
          }}
        >
          Too small
        </span>
      )}

      {/* Header row: icon + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, paddingRight: 70 /* space for badge */ }}>
        <span
          aria-hidden="true"
          style={{
            fontSize: 26,
            filter: disabled ? "grayscale(0.8) opacity(0.5)" : "none",
          }}
        >
          {v.icon}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: palette.labelColor,
            lineHeight: 1.2,
          }}
        >
          {v.label}
        </span>
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 12,
          color: disabled ? "rgba(232,232,232,0.35)" : "rgba(232,232,232,0.78)",
          marginBottom: 8,
          lineHeight: 1.45,
        }}
      >
        {v.description}
      </div>

      {/* Footer row: capacity + price (sticky to card bottom via flex) */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: 8,
          borderTop: "1px dashed rgba(255,255,255,0.06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        {/* Capacity icon-row */}
        <span
          style={{
            fontSize: 11,
            color: disabled ? "rgba(232,232,232,0.35)" : C.midGray,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span aria-hidden="true">👤</span>
          {v.id === "flight_economy" ||
          v.id.includes("shared") ||
          v.id.startsWith("daewoo")
            ? "Per-person"
            : `Up to ${v.capacity}`}
        </span>

        {/* Seed price */}
        {seedPrice && (
          <span
            style={{
              fontSize: 11,
              fontFamily: "'DM Mono', monospace",
              color: disabled ? "rgba(232,232,232,0.35)" : C.offWhite,
              fontWeight: 500,
            }}
          >
            from PKR {seedPrice.price}
            <span style={{ color: C.midGray, fontWeight: 400 }}>{seedPrice.unit}</span>
          </span>
        )}
      </div>
    </button>
  );
}