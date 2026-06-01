import { useState, useEffect } from "react";
import { C } from "../../styles/colors";
import api from "../../api/client";

// Vehicle catalog mirrors constants/vehicles.js labels exactly so the admin
// sees the same names as users. Seeds are the backend rent-only per-km rates
// (Backend/src/utils/vehicleOptions.ts costPerKmPKR) that the admin can override.
const VEHICLE_SEEDS = [
  { id: "hatchback_private", label: "Suzuki Alto (with driver)",          seed: 22  },
  { id: "sedan_private",     label: "Toyota Corolla (with driver)",       seed: 28  },
  { id: "sedan_shared",      label: "Shared Car (inDriver / Careem)",     seed: 8   },
  { id: "suv_private",       label: "Toyota Fortuner (4x4)",              seed: 45  },
  { id: "hiace_private",     label: "Toyota Hiace (with driver)",         seed: 60  },
  { id: "hiace_shared",      label: "Shared Hiace Van",                   seed: 12  },
  { id: "coaster_private",   label: "Toyota Coaster (group)",             seed: 90  },
  { id: "daewoo_business",   label: "Daewoo Business Class",              seed: 4.5 },
  { id: "daewoo_economy",    label: "Daewoo / Faisal Movers Economy",     seed: 3   },
  { id: "flight_economy",    label: "Flight (PIA / SereneAir / Airblue)", seed: 22  },
];

const FLIGHT_ROUTE_SEEDS = [
  { key: "lahore-islamabad",  seed: 12000 },
  { key: "lahore-karachi",    seed: 22000 },
  { key: "lahore-skardu",     seed: 32000 },
  { key: "lahore-gilgit",     seed: 28000 },
  { key: "islamabad-karachi", seed: 22000 },
  { key: "islamabad-skardu",  seed: 28000 },
  { key: "islamabad-gilgit",  seed: 24000 },
  { key: "karachi-quetta",    seed: 22000 },
  { key: "karachi-gwadar",    seed: 20000 },
  { key: "karachi-skardu",    seed: 45000 },
];

export default function AdminPricing() {
  const [server, setServer] = useState({
    serviceFee: 8,
    freeTripLimit: 5,
    fuelPrice: 402,
    vehicleOverrides: {},
    flightOverrides: {},
  });

  const [draftRevenue, setDraftRevenue] = useState(null);
  const [draftVehicles, setDraftVehicles] = useState(null);
  const [draftFlights, setDraftFlights] = useState(null);

  const [expanded, setExpanded] = useState({
    revenue: true,
    vehicles: false,
    flights: false,
  });

  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const [savingSection, setSavingSection] = useState("");
  const [sectionMsg, setSectionMsg] = useState({});
  const [sectionErr, setSectionErr] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/admin/config");
        if (cancelled) return;
        const eff = data.data?.effective || {};
        setServer({
          serviceFee: eff.tripServiceFeePercent ?? 8,
          freeTripLimit: eff.freeTripLimit ?? 5,
          fuelPrice: eff.fuelPricePerLiterPKR ?? 402,
          vehicleOverrides: eff.vehicleOverridesPKR || {},
          flightOverrides: eff.flightRouteOverridesPKR || {},
        });
        setUpdatedAt(data.data?.raw?.updatedAt || null);
      } catch (err) {
        setGlobalError(err.response?.data?.message || "Failed to load pricing config.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const beginEditRevenue = () => {
    setDraftRevenue({
      serviceFee: server.serviceFee,
      freeTripLimit: server.freeTripLimit,
      fuelPrice: server.fuelPrice,
    });
    setSectionErr((p) => ({ ...p, revenue: "" }));
    setSectionMsg((p) => ({ ...p, revenue: "" }));
  };
  const cancelEditRevenue = () => setDraftRevenue(null);

  const beginEditVehicles = () => {
    setDraftVehicles({ ...server.vehicleOverrides });
    setSectionErr((p) => ({ ...p, vehicles: "" }));
    setSectionMsg((p) => ({ ...p, vehicles: "" }));
  };
  const cancelEditVehicles = () => setDraftVehicles(null);

  const beginEditFlights = () => {
    setDraftFlights({ ...server.flightOverrides });
    setSectionErr((p) => ({ ...p, flights: "" }));
    setSectionMsg((p) => ({ ...p, flights: "" }));
  };
  const cancelEditFlights = () => setDraftFlights(null);

  const saveRevenue = async () => {
    if (!draftRevenue) return;
    setSavingSection("revenue");
    setSectionErr((p) => ({ ...p, revenue: "" }));
    setSectionMsg((p) => ({ ...p, revenue: "" }));
    try {
      const payload = {
        tripServiceFeePercent: Number(draftRevenue.serviceFee),
        freeTripLimit: Number(draftRevenue.freeTripLimit),
        fuelPricePerLiterPKR: Number(draftRevenue.fuelPrice),
      };
      const { data } = await api.patch("/admin/config", payload);
      setServer((p) => ({
        ...p,
        serviceFee: payload.tripServiceFeePercent,
        freeTripLimit: payload.freeTripLimit,
        fuelPrice: payload.fuelPricePerLiterPKR,
      }));
      setUpdatedAt(data.data?.config?.updatedAt || new Date().toISOString());
      setSectionMsg((p) => ({ ...p, revenue: `✓ Saved at ${new Date().toLocaleTimeString("en-PK")}` }));
      setDraftRevenue(null);
      setTimeout(() => setSectionMsg((p) => ({ ...p, revenue: "" })), 5000);
    } catch (err) {
      setSectionErr((p) => ({ ...p, revenue: err.response?.data?.message || "Save failed." }));
    } finally {
      setSavingSection("");
    }
  };

  const saveVehicles = async () => {
    if (!draftVehicles) return;
    setSavingSection("vehicles");
    setSectionErr((p) => ({ ...p, vehicles: "" }));
    setSectionMsg((p) => ({ ...p, vehicles: "" }));
    try {
      const clean = {};
      for (const [k, v] of Object.entries(draftVehicles)) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) clean[k] = n;
      }
      const payload = { vehicleOverridesPKR: clean };
      const { data } = await api.patch("/admin/config", payload);
      setServer((p) => ({ ...p, vehicleOverrides: clean }));
      setUpdatedAt(data.data?.config?.updatedAt || new Date().toISOString());
      setSectionMsg((p) => ({ ...p, vehicles: `✓ Saved at ${new Date().toLocaleTimeString("en-PK")}` }));
      setDraftVehicles(null);
      setTimeout(() => setSectionMsg((p) => ({ ...p, vehicles: "" })), 5000);
    } catch (err) {
      setSectionErr((p) => ({ ...p, vehicles: err.response?.data?.message || "Save failed." }));
    } finally {
      setSavingSection("");
    }
  };

  const saveFlights = async () => {
    if (!draftFlights) return;
    setSavingSection("flights");
    setSectionErr((p) => ({ ...p, flights: "" }));
    setSectionMsg((p) => ({ ...p, flights: "" }));
    try {
      const clean = {};
      for (const [k, v] of Object.entries(draftFlights)) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) clean[k] = n;
      }
      const payload = { flightRouteOverridesPKR: clean };
      const { data } = await api.patch("/admin/config", payload);
      setServer((p) => ({ ...p, flightOverrides: clean }));
      setUpdatedAt(data.data?.config?.updatedAt || new Date().toISOString());
      setSectionMsg((p) => ({ ...p, flights: `✓ Saved at ${new Date().toLocaleTimeString("en-PK")}` }));
      setDraftFlights(null);
      setTimeout(() => setSectionMsg((p) => ({ ...p, flights: "" })), 5000);
    } catch (err) {
      setSectionErr((p) => ({ ...p, flights: err.response?.data?.message || "Save failed." }));
    } finally {
      setSavingSection("");
    }
  };

  const setVehicleDraft = (id, val) => {
    setDraftVehicles((prev) => {
      const next = { ...(prev || {}) };
      if (val === "" || val == null) delete next[id];
      else next[id] = val;
      return next;
    });
  };
  const setFlightDraft = (key, val) => {
    setDraftFlights((prev) => {
      const next = { ...(prev || {}) };
      if (val === "" || val == null) delete next[key];
      else next[key] = val;
      return next;
    });
  };

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

  const vehicleOverrideCount = Object.keys(server.vehicleOverrides).length;
  const flightOverrideCount = Object.keys(server.flightOverrides).length;

  return (
    <div className="anim-fadeIn">
      <div style={{ marginBottom: 24 }}>
        <p className="section-label">Operations</p>
        <h2 className="display-heading" style={{ fontSize: 28 }}>Pricing Controls</h2>
        <p style={{ color: C.midGray, fontSize: 13, marginTop: 6, maxWidth: 720 }}>
          Edit each section independently. Changes apply within ~30 seconds without redeploy.
          Click <strong>Edit</strong> on a section, make your changes, and hit <strong>Save</strong> — only that section is sent to the server.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {updatedAt && (
          <div style={{ fontSize: 12, color: C.midGray, padding: "6px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6 }}>
            Last saved: {new Date(updatedAt).toLocaleString("en-PK")}
          </div>
        )}
        {globalError && (
          <div role="alert" style={{ fontSize: 12, color: "#FF8080", padding: "6px 12px", background: "rgba(255,128,128,0.08)", border: "1px solid rgba(255,128,128,0.4)", borderRadius: 6 }}>
            {globalError}
          </div>
        )}
      </div>

      <SectionCard
        icon="💰"
        title="Revenue & Limits"
        summary={`${server.serviceFee}% fee · ${server.freeTripLimit} free trips · PKR ${Number(server.fuelPrice).toLocaleString()}/L`}
        expanded={expanded.revenue}
        onToggle={() => setExpanded((p) => ({ ...p, revenue: !p.revenue }))}
        editing={!!draftRevenue}
        onEdit={beginEditRevenue}
        onCancel={cancelEditRevenue}
        onSave={saveRevenue}
        saving={savingSection === "revenue"}
        msg={sectionMsg.revenue}
        err={sectionErr.revenue}
      >
        {draftRevenue ? (
          <div
            className="vai-admin-grid-1col"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}
          >
            <FieldNumber label="Service fee %" value={draftRevenue.serviceFee} onChange={(v) => setDraftRevenue((p) => ({ ...p, serviceFee: v }))} suffix="%" min={0} max={50} step={0.5} hint="Added on top of trip cost at checkout" />
            <FieldNumber label="Free trip limit" value={draftRevenue.freeTripLimit} onChange={(v) => setDraftRevenue((p) => ({ ...p, freeTripLimit: v }))} min={0} max={100} step={1} hint="Free-tier users locked after this many trips" />
            <FieldNumber label="Fuel price (PKR / litre)" value={draftRevenue.fuelPrice} onChange={(v) => setDraftRevenue((p) => ({ ...p, fuelPrice: v }))} prefix="PKR" min={1} step={1} hint="Used for fuel-cost transparency in itineraries" />
          </div>
        ) : (
          <ReadonlyRevenue server={server} />
        )}
      </SectionCard>

      <SectionCard
        icon="🚗"
        title="Vehicle cost-per-km overrides"
        summary={vehicleOverrideCount === 0 ? "All using seed defaults" : `${vehicleOverrideCount} of ${VEHICLE_SEEDS.length} overridden`}
        expanded={expanded.vehicles}
        onToggle={() => setExpanded((p) => ({ ...p, vehicles: !p.vehicles }))}
        editing={!!draftVehicles}
        onEdit={beginEditVehicles}
        onCancel={cancelEditVehicles}
        onSave={saveVehicles}
        saving={savingSection === "vehicles"}
        msg={sectionMsg.vehicles}
        err={sectionErr.vehicles}
      >
        <p style={{ color: C.midGray, fontSize: 12, marginBottom: 16 }}>
          Leave blank to use the seed default. Edits affect every newly-generated trip immediately.
        </p>
        <div
          className="vai-admin-grid-1col"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}
        >
          {VEHICLE_SEEDS.map((v) => {
            const valueSource = draftVehicles ?? server.vehicleOverrides;
            const current = valueSource[v.id] ?? "";
            const isOverridden = current !== "" && current !== undefined;
            return (
              <OverrideRow key={v.id} label={v.label} seedValue={v.seed} suffix="/km" currentValue={current} onChange={(val) => setVehicleDraft(v.id, val)} onReset={() => setVehicleDraft(v.id, "")} isOverridden={isOverridden} readOnly={!draftVehicles} />
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        icon="✈️"
        title="Flight route prices"
        summary={flightOverrideCount === 0 ? "All using seed defaults" : `${flightOverrideCount} of ${FLIGHT_ROUTE_SEEDS.length} overridden`}
        expanded={expanded.flights}
        onToggle={() => setExpanded((p) => ({ ...p, flights: !p.flights }))}
        editing={!!draftFlights}
        onEdit={beginEditFlights}
        onCancel={cancelEditFlights}
        onSave={saveFlights}
        saving={savingSection === "flights"}
        msg={sectionMsg.flights}
        err={sectionErr.flights}
      >
        <p style={{ color: C.midGray, fontSize: 12, marginBottom: 16 }}>
          Per-route fixed prices in PKR per person (one-way). Leave blank to use the seed default.
        </p>
        <div
          className="vai-admin-grid-1col"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}
        >
          {FLIGHT_ROUTE_SEEDS.map((r) => {
            const valueSource = draftFlights ?? server.flightOverrides;
            const current = valueSource[r.key] ?? "";
            const isOverridden = current !== "" && current !== undefined;
            return (
              <OverrideRow key={r.key} label={r.key.replace("-", " → ")} seedValue={r.seed} currentValue={current} onChange={(val) => setFlightDraft(r.key, val)} onReset={() => setFlightDraft(r.key, "")} isOverridden={isOverridden} readOnly={!draftFlights} />
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

function SectionCard({ icon, title, summary, expanded, onToggle, editing, onEdit, onCancel, onSave, saving, msg, err, children }) {
  return (
    <div
      className="card"
      style={{
        marginBottom: 16,
        overflow: "hidden",
        transition: "border-color 0.2s",
        borderColor: editing ? "rgba(168,119,212,0.5)" : undefined,
      }}
    >
      <button
        onClick={onToggle}
        type="button"
        className="vai-admin-section-head"
        style={{
          width: "100%",
          padding: "20px 24px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          color: "inherit",
          textAlign: "left",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="vai-admin-section-title" style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: C.offWhite, marginBottom: 3 }}>
              {title}
            </div>
            <div className="vai-admin-section-summary" style={{ fontSize: 12, color: C.midGray, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {summary}
            </div>
          </div>
        </div>
        <span style={{ color: C.midGray, fontSize: 14, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }} aria-hidden>
          ▾
        </span>
      </button>

      {expanded && (
        <div className="vai-admin-section-body" style={{ padding: "0 24px 22px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {(msg || err) && (
            <div style={{ display: "flex", gap: 10, padding: "16px 0 4px", flexWrap: "wrap" }}>
              {msg && (
                <span style={{ fontSize: 12, color: "#5CCC5C", padding: "5px 10px", background: "rgba(92,204,92,0.08)", border: "1px solid rgba(92,204,92,0.4)", borderRadius: 6 }}>
                  {msg}
                </span>
              )}
              {err && (
                <span role="alert" style={{ fontSize: 12, color: "#FF8080", padding: "5px 10px", background: "rgba(255,128,128,0.08)", border: "1px solid rgba(255,128,128,0.4)", borderRadius: 6 }}>
                  {err}
                </span>
              )}
            </div>
          )}

          <div style={{ paddingTop: 18 }}>{children}</div>

          <div
            className="vai-admin-action-row"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 22,
              paddingTop: 18,
              borderTop: "1px dashed rgba(255,255,255,0.08)",
            }}
          >
            {!editing ? (
              <button
                onClick={onEdit}
                style={{ padding: "10px 18px", background: "transparent", border: `1px solid rgba(168,119,212,0.5)`, borderRadius: 6, color: "rgba(168,119,212,1)", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(168,119,212,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                ✎ Edit changes
              </button>
            ) : (
              <>
                <button
                  onClick={onCancel}
                  disabled={saving}
                  style={{ padding: "10px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: C.midGray, fontSize: 13, cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.5 : 1 }}
                >
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="btn-primary"
                  style={{ padding: "10px 22px", fontSize: 13, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}
                >
                  {saving ? "Saving…" : "Save section"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReadonlyRevenue({ server }) {
  const items = [
    { label: "Service fee", value: `${server.serviceFee}%`, hint: "Added at checkout" },
    { label: "Free trip limit", value: `${server.freeTripLimit} trips`, hint: "Per free-tier user" },
    { label: "Fuel price", value: `PKR ${Number(server.fuelPrice).toLocaleString()}`, hint: "Per litre (OGRA)" },
  ];
  return (
    <div
      className="vai-admin-grid-1col"
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}
    >
      {items.map((it) => (
        <div key={it.label} style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: C.midGray, marginBottom: 4 }}>{it.label}</div>
          <div style={{ fontSize: 18, fontWeight: 600, fontFamily: "'Playfair Display', serif", color: C.offWhite, marginBottom: 4 }}>{it.value}</div>
          <div style={{ fontSize: 11, color: C.midGray }}>{it.hint}</div>
        </div>
      ))}
    </div>
  );
}

function FieldNumber({ label, value, onChange, prefix, suffix, min, max, step, hint }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: C.midGray, display: "block", marginBottom: 6, fontWeight: 500 }}>{label}</label>
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
          style={{ flex: 1, padding: "10px 12px", border: "none", outline: "none", background: "transparent", color: C.offWhite, fontSize: 14, fontFamily: "'DM Mono', monospace", minWidth: 0 }}
        />
        {suffix && (
          <span style={{ padding: "10px 12px", color: C.midGray, fontSize: 13, background: "rgba(255,255,255,0.04)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
            {suffix}
          </span>
        )}
      </div>
      {hint && <p style={{ fontSize: 11, color: C.midGray, marginTop: 6, lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

function OverrideRow({ label, seedValue, currentValue, onChange, onReset, isOverridden, suffix, readOnly }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: isOverridden ? "rgba(168,119,212,0.06)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isOverridden ? "rgba(168,119,212,0.4)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 6,
        opacity: readOnly ? 0.85 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: C.offWhite, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, color: C.midGray, fontFamily: "'DM Mono', monospace" }}>
          seed: {seedValue}{suffix || ""}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="number"
          value={currentValue}
          placeholder={readOnly ? (isOverridden ? "" : "default") : `use ${seedValue}`}
          min={0}
          step={0.5}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, padding: "8px 10px", background: readOnly ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, color: C.offWhite, fontSize: 13, fontFamily: "'DM Mono', monospace", outline: "none", cursor: readOnly ? "not-allowed" : "text", minWidth: 0 }}
        />
        {!readOnly && isOverridden && (
          <button
            onClick={onReset}
            aria-label={`Reset ${label} to seed default`}
            style={{ padding: "8px 12px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: C.midGray, fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}
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