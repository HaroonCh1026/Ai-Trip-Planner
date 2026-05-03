import { useState, useEffect } from "react";
import { C } from "../../styles/colors";
import api from "../../api/client";

// ─── Vehicle metadata for the override editor ───────────────────────────────
// We hardcode the seed PKR/km here just for UI display — admin sees what
// the seed default is and can choose to override or leave blank. The real
// seed lives in Backend/src/utils/vehicleOptions.ts; if you change it
// there, update here too. (Not auto-synced; minor design tradeoff for
// keeping the admin page self-contained.)
const VEHICLE_SEEDS = [
  { id: "sedan_private",   label: "Sedan (Private)",            seed: 25 },
  { id: "sedan_shared",    label: "Sedan (Shared)",             seed: 8  },
  { id: "suv_private",     label: "SUV (Private)",              seed: 45 },
  { id: "hiace_private",   label: "Hiace (Private)",            seed: 60 },
  { id: "hiace_shared",    label: "Hiace (Shared)",             seed: 12 },
  { id: "coaster_private", label: "Coaster (Private)",          seed: 120 },
  { id: "daewoo_business", label: "Daewoo Business Class",      seed: 4.5 },
  { id: "daewoo_economy",  label: "Daewoo / Faisal Economy",    seed: 3 },
  { id: "flight_economy",  label: "Flight (Economy fallback)",  seed: 22 },
];

// Common flight routes admin may want to override. Empty string = use seed.
const FLIGHT_ROUTE_SEEDS = [
  { key: "lahore-islamabad", seed: 12000 },
  { key: "lahore-karachi",   seed: 22000 },
  { key: "lahore-skardu",    seed: 32000 },
  { key: "lahore-gilgit",    seed: 28000 },
  { key: "islamabad-karachi", seed: 22000 },
  { key: "islamabad-skardu", seed: 28000 },
  { key: "islamabad-gilgit", seed: 24000 },
  { key: "karachi-quetta",   seed: 22000 },
  { key: "karachi-gwadar",   seed: 20000 },
  { key: "karachi-skardu",   seed: 45000 },
];

export default function AdminPricing() {
  // Form state — all fields editable
  const [serviceFee, setServiceFee]    = useState(8);
  const [freeTripLimit, setFreeTripLimit] = useState(5);
  const [fuelPrice, setFuelPrice]      = useState(402);
  // Sparse overrides — empty string = "use seed default"
  const [vehicleOverrides, setVehicleOverrides] = useState({});
  const [flightOverrides, setFlightOverrides]   = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError]     = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  // ── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/admin/config");
        if (cancelled) return;
        const eff = data.data?.effective || {};
        setServiceFee(eff.tripServiceFeePercent ?? 8);
        setFreeTripLimit(eff.freeTripLimit ?? 5);
        setFuelPrice(eff.fuelPricePerLiterPKR ?? 402);
        setVehicleOverrides(eff.vehicleOverridesPKR || {});
        setFlightOverrides(eff.flightRouteOverridesPKR || {});
        setUpdatedAt(data.data?.raw?.updatedAt || null);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load pricing config.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSavedAt(null);
    try {
      // Strip empty/zero/non-numeric override entries so we don't store junk.
      // Empty string in the input = "no override, use seed default".
      const cleanVehicle = {};
      for (const [k, v] of Object.entries(vehicleOverrides)) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) cleanVehicle[k] = n;
      }
      const cleanFlight = {};
      for (const [k, v] of Object.entries(flightOverrides)) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) cleanFlight[k] = n;
      }

      const payload = {
        tripServiceFeePercent: Number(serviceFee),
        freeTripLimit: Number(freeTripLimit),
        fuelPricePerLiterPKR: Number(fuelPrice),
        vehicleOverridesPKR: cleanVehicle,
        flightRouteOverridesPKR: cleanFlight,
      };
      const { data } = await api.patch("/admin/config", payload);
      setUpdatedAt(data.data?.config?.updatedAt || new Date().toISOString());
      setSavedAt(new Date());
    } catch (err) {
      setError(err.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  // ── Override handlers ───────────────────────────────────────────────────
  const setVehicleOverride = (id, val) => {
    setVehicleOverrides((prev) => {
      const next = { ...prev };
      if (val === "" || val == null) delete next[id];
      else next[id] = val;
      return next;
    });
  };
  const setFlightOverride = (key, val) => {
    setFlightOverrides((prev) => {
      const next = { ...prev };
      if (val === "" || val == null) delete next[key];
      else next[key] = val;
      return next;
    });
  };
  const resetVehicle = (id) => setVehicleOverride(id, "");
  const resetFlight  = (key) => setFlightOverride(key, "");

  if (loading) {
    return (
      <div className="anim-fadeIn">
        <div style={{ marginBottom: 32 }}>
          <p className="section-label">Operations</p>
          <h2 className="display-heading" style={{ fontSize: 28 }}>Pricing Controls</h2>
        </div>
        <div className="card" style={{ padding: 40, textAlign: "center", color: C.midGray }}>
          Loading current pricing…
        </div>
      </div>
    );
  }

  return (
    <div className="anim-fadeIn">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p className="section-label">Operations</p>
        <h2 className="display-heading" style={{ fontSize: 28 }}>Pricing Controls</h2>
        <p style={{ color: C.midGray, fontSize: 13, marginTop: 6, maxWidth: 720 }}>
          Edit service fee, fuel price, vehicle costs, and flight route prices live. Changes apply within ~30 seconds — no redeploy needed.
        </p>
      </div>

      {/* Status row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {updatedAt && (
          <div style={{ fontSize: 12, color: C.midGray, padding: "6px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6 }}>
            Last saved: {new Date(updatedAt).toLocaleString("en-PK")}
          </div>
        )}
        {savedAt && (
          <div style={{ fontSize: 12, color: "#5CCC5C", padding: "6px 12px", background: "rgba(92,204,92,0.08)", border: "1px solid rgba(92,204,92,0.4)", borderRadius: 6 }}>
            ✓ Saved at {savedAt.toLocaleTimeString("en-PK")}
          </div>
        )}
        {error && (
          <div role="alert" style={{ fontSize: 12, color: "#FF8080", padding: "6px 12px", background: "rgba(255,128,128,0.08)", border: "1px solid rgba(255,128,128,0.4)", borderRadius: 6 }}>
            {error}
          </div>
        )}
      </div>

      {/* ── Section 1: Headline parameters ──────────────────────────────── */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 4, color: C.offWhite }}>
          Revenue & limits
        </h3>
        <p style={{ color: C.midGray, fontSize: 12, marginBottom: 20 }}>
          The fee is added on top of every booking. Free trip limit applies to free-tier users only.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
          <FieldNumber
            label="Service fee %"
            value={serviceFee}
            onChange={setServiceFee}
            suffix="%"
            min={0}
            max={50}
            step={0.5}
            hint="Added on top of trip cost at checkout"
          />
          <FieldNumber
            label="Free trip limit"
            value={freeTripLimit}
            onChange={setFreeTripLimit}
            min={0}
            max={100}
            step={1}
            hint="Free-tier users locked after this many trips"
          />
          <FieldNumber
            label="Fuel price (PKR / litre)"
            value={fuelPrice}
            onChange={setFuelPrice}
            prefix="PKR"
            min={1}
            step={1}
            hint="Used for fuel-cost transparency in itineraries"
          />
        </div>
      </div>

      {/* ── Section 2: Vehicle cost overrides ───────────────────────────── */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 4, color: C.offWhite }}>
          Vehicle cost-per-km overrides
        </h3>
        <p style={{ color: C.midGray, fontSize: 12, marginBottom: 20 }}>
          Leave blank to use the seed default. Editing here changes transport cost on every newly generated trip immediately.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {VEHICLE_SEEDS.map((v) => (
            <OverrideRow
              key={v.id}
              label={v.label}
              seedValue={v.seed}
              suffix="/km"
              currentValue={vehicleOverrides[v.id] ?? ""}
              onChange={(val) => setVehicleOverride(v.id, val)}
              onReset={() => resetVehicle(v.id)}
              isOverridden={vehicleOverrides[v.id] !== undefined && vehicleOverrides[v.id] !== ""}
            />
          ))}
        </div>
      </div>

      {/* ── Section 3: Flight route overrides ───────────────────────────── */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 4, color: C.offWhite }}>
          Flight route prices (PKR per person)
        </h3>
        <p style={{ color: C.midGray, fontSize: 12, marginBottom: 20 }}>
          Per-route fixed prices. These are end-to-end one-way values — used for the flight option in trip generation.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {FLIGHT_ROUTE_SEEDS.map((r) => (
            <OverrideRow
              key={r.key}
              label={r.key.replace("-", " → ")}
              seedValue={r.seed}
              currentValue={flightOverrides[r.key] ?? ""}
              onChange={(val) => setFlightOverride(r.key, val)}
              onReset={() => resetFlight(r.key)}
              isOverridden={flightOverrides[r.key] !== undefined && flightOverrides[r.key] !== ""}
            />
          ))}
        </div>
      </div>

      {/* ── Save bar ────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "linear-gradient(180deg, rgba(13,13,13,0) 0%, #0d0d0d 30%)",
          paddingTop: 24,
          paddingBottom: 8,
          marginTop: 8,
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
        }}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
          style={{
            padding: "12px 28px",
            fontSize: 14,
            opacity: saving ? 0.6 : 1,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

// ─── Field components ──────────────────────────────────────────────────────

function FieldNumber({ label, value, onChange, prefix, suffix, min, max, step, hint }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: C.midGray, display: "block", marginBottom: 6, fontWeight: 500 }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "stretch", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, overflow: "hidden", background: "rgba(255,255,255,0.03)" }}>
        {prefix && (
          <span style={{ padding: "10px 12px", color: C.midGray, fontSize: 13, background: "rgba(255,255,255,0.04)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "none",
            outline: "none",
            background: "transparent",
            color: C.offWhite,
            fontSize: 14,
            fontFamily: "'DM Mono', monospace",
          }}
        />
        {suffix && (
          <span style={{ padding: "10px 12px", color: C.midGray, fontSize: 13, background: "rgba(255,255,255,0.04)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p style={{ fontSize: 11, color: C.midGray, marginTop: 6, lineHeight: 1.4 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function OverrideRow({ label, seedValue, currentValue, onChange, onReset, isOverridden, suffix }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: isOverridden ? "rgba(168,119,212,0.06)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isOverridden ? "rgba(168,119,212,0.4)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 6,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: C.offWhite, fontWeight: 500 }}>
          {label}
        </span>
        <span style={{ fontSize: 11, color: C.midGray, fontFamily: "'DM Mono', monospace" }}>
          seed: {seedValue}{suffix || ""}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="number"
          value={currentValue}
          placeholder={`use ${seedValue}`}
          min={0}
          step={0.5}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            padding: "8px 10px",
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 4,
            color: C.offWhite,
            fontSize: 13,
            fontFamily: "'DM Mono', monospace",
            outline: "none",
          }}
        />
        {isOverridden && (
          <button
            onClick={onReset}
            aria-label={`Reset ${label} to seed default`}
            style={{
              padding: "8px 12px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 4,
              color: C.midGray,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.offWhite; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.midGray; }}
          >
            ↻
          </button>
        )}
      </div>
    </div>
  );
}