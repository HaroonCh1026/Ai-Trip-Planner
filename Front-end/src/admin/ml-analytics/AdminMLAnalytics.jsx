import { useEffect, useState } from "react";
import { C } from "../../styles/colors";
import { Icon } from "../../components/Icon";
import api from "../../api/client";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

/**
 * AdminMLAnalytics — Day 5C ML model performance dashboard.
 *
 * Surfaces three perspectives on the cost-prediction model:
 *
 *   1. Training metrics (R², MAE, RMSE) — what the model achieved on the
 *      held-out test set during training. Cite-able numbers for reports.
 *
 *   2. Real-world performance — how the model compares to Gemini's
 *      cost estimates on actual user-generated trips. Includes a
 *      "within range" accuracy %, which captures how often the model
 *      successfully validated Gemini's number.
 *
 *   3. Regional breakdown — average prediction error per destination,
 *      so admin can spot which regions need more training data.
 *
 * The scatter chart is the marquee visual: each dot is a real trip,
 * positioned by (predicted, actual). Points on the diagonal = perfect
 * prediction. Visually, the closer the cloud hugs the diagonal, the
 * better the model is performing in production.
 */

const fmtPKR = (n) => `PKR ${Math.round(n || 0).toLocaleString()}`;
const fmtCompact = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
};

export default function AdminMLAnalytics() {
  const [meta, setMeta]                 = useState(null);
  const [points, setPoints]             = useState([]);
  const [regions, setRegions]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [m, p, r] = await Promise.all([
          api.get("/admin/ml-analytics/meta"),
          api.get("/admin/ml-analytics/predictions"),
          api.get("/admin/ml-analytics/by-region"),
        ]);
        if (cancelled) return;
        setMeta(m.data.data);
        setPoints(p.data.data?.points || []);
        setRegions(r.data.data?.regions || []);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || "Failed to load ML analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="anim-fadeIn">
        <div style={{ marginBottom: 32 }}>
          <p className="section-label">Operations</p>
          <h2 className="display-heading" style={{ fontSize: 28 }}>ML Analytics</h2>
        </div>
        <div className="card" style={{ padding: 40, textAlign: "center", color: C.midGray }}>
          Loading model performance data…
        </div>
      </div>
    );
  }

  // Compute scatter chart axis bounds — round up nicely so axes look clean
  const allValues = points.flatMap((p) => [p.predicted, p.actual]).filter((v) => v > 0);
  const dataMax = allValues.length > 0 ? Math.max(...allValues) : 100000;
  const axisMax = Math.ceil(dataMax / 50000) * 50000; // round up to nearest 50k

  // Split points by withinRange for color-coding the scatter
  const inRangePoints  = points.filter((p) => p.withinRange);
  const outRangePoints = points.filter((p) => !p.withinRange);

  // Stat cards data
  const r2          = meta?.meta?.metrics?.r2;
  const mae         = meta?.meta?.metrics?.mae;
  const rmse        = meta?.meta?.metrics?.rmse;
  const datasetRows = meta?.meta?.dataset_rows;
  const winningModel = meta?.meta?.winning_model;
  const trainedAt   = meta?.meta?.trained_at;

  const statCards = [
    {
      label: "Model R²",
      value: r2 != null ? r2.toFixed(4) : "—",
      sub: r2 != null && r2 >= 0.9 ? "Excellent fit" : r2 != null && r2 >= 0.75 ? "Good fit" : r2 != null ? "Moderate fit" : "Service offline",
      icon: <Icon.sparkle />,
      accent: r2 != null && r2 >= 0.9 ? "#5CCC5C" : "#FFB400",
    },
    {
      label: "Mean Absolute Error",
      value: mae != null ? fmtPKR(mae) : "—",
      sub: rmse != null ? `RMSE ${fmtPKR(rmse)}` : "test-set MAE",
      icon: <Icon.dollar />,
      accent: "#A877D4",
    },
    {
      label: "Real-World Accuracy",
      value: meta?.realWorld?.sampleSize > 0
        ? `${meta.realWorld.withinRangeAccuracy}%`
        : "—",
      sub: meta?.realWorld?.sampleSize > 0
        ? `${meta.realWorld.sampleSize} predictions`
        : "no predictions yet",
      icon: <Icon.shield />,
      accent: "#5CCC5C",
    },
    {
      label: "Avg Drift",
      value: meta?.realWorld?.sampleSize > 0
        ? `${meta.realWorld.avgAbsDeltaPercent}%`
        : "—",
      sub: "vs Gemini estimate",
      icon: <Icon.map />,
      accent: C.crimson,
    },
  ];

  return (
    <div className="anim-fadeIn">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p className="section-label">Operations</p>
        <h2 className="display-heading" style={{ fontSize: 28 }}>ML Analytics</h2>
        <p style={{ color: C.midGray, fontSize: 13, marginTop: 6, maxWidth: 720 }}>
          Performance of the cost-prediction model trained on the Pakistan trips dataset. Used to validate Gemini's cost estimates against learned patterns.
        </p>
      </div>

      {/* Service-down warning */}
      {meta && !meta.available && (
        <div className="card" style={{
          padding: 14,
          marginBottom: 20,
          background: "rgba(255,180,0,0.08)",
          border: "1px solid rgba(255,180,0,0.3)",
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16 }}>⚠</span>
            <div style={{ fontSize: 12, color: "#FFB400", lineHeight: 1.5 }}>
              <strong>ML service unreachable</strong> — training metadata cannot be fetched.
              Real-world prediction analytics are still available below from stored trip data.
              Start the Python ML service (port 5001) to see model R²/MAE.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" style={{ marginBottom: 20, padding: 12, color: "#FF8080", background: "rgba(255,128,128,0.08)", border: "1px solid rgba(255,128,128,0.4)", borderRadius: 6, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 24 }}>
        {statCards.map((s) => (
          <div key={s.label} className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ color: s.accent }}>{s.icon}</div>
              <div style={{ fontSize: 11, color: C.midGray, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {s.sub}
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'Playfair Display', serif", marginBottom: 4, color: C.offWhite }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: C.midGray }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Scatter — Predicted vs Actual */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: C.offWhite }}>
              Predicted vs Actual Cost
            </h3>
            <span style={{ fontSize: 11, color: C.midGray }}>
              {points.length} {points.length === 1 ? "trip" : "trips"}
            </span>
          </div>
          <p style={{ color: C.midGray, fontSize: 12, marginBottom: 18 }}>
            Each dot is one user trip. Points on the dashed diagonal = perfect agreement. Green = within model's confidence band, amber = outside.
          </p>

          {points.length === 0 ? (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: C.midGray, fontSize: 13 }}>
              No predictions yet. Generate trips to populate the chart.
            </div>
          ) : (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: -16 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="predicted"
                    name="Predicted"
                    domain={[0, axisMax]}
                    stroke={C.midGray}
                    tick={{ fontSize: 10, fill: C.midGray }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    tickFormatter={fmtCompact}
                    label={{
                      value: "ML Predicted (PKR)",
                      position: "insideBottom",
                      offset: -16,
                      fill: C.midGray,
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="actual"
                    name="Actual"
                    domain={[0, axisMax]}
                    stroke={C.midGray}
                    tick={{ fontSize: 10, fill: C.midGray }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={fmtCompact}
                    label={{
                      value: "Gemini (PKR)",
                      angle: -90,
                      position: "insideLeft",
                      offset: 14,
                      fill: C.midGray,
                      fontSize: 11,
                    }}
                  />
                  <ZAxis range={[60, 60]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.2)" }}
                    contentStyle={{
                      background: "#1a1a1a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6,
                      fontSize: 12,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                    labelStyle={{ color: C.offWhite }}
                    itemStyle={{ color: C.offWhite }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload;
                      return (
                        <div style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: 10, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                          <div style={{ color: C.offWhite, fontWeight: 600, marginBottom: 6, textTransform: "capitalize" }}>
                            {p.destination} · {p.days}d
                          </div>
                          <div style={{ color: C.midGray, lineHeight: 1.6 }}>
                            <div>ML predicted: <span style={{ color: C.offWhite }}>{fmtPKR(p.predicted)}</span></div>
                            <div>Gemini: <span style={{ color: C.offWhite }}>{fmtPKR(p.actual)}</span></div>
                            <div>Drift: <span style={{ color: Math.abs(p.deltaPercent) > 25 ? "#FFB400" : "#5CCC5C" }}>{p.deltaPercent > 0 ? "+" : ""}{p.deltaPercent}%</span></div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  {/* Diagonal reference line: y = x */}
                  <ReferenceLine
                    segment={[{ x: 0, y: 0 }, { x: axisMax, y: axisMax }]}
                    stroke="rgba(255,255,255,0.25)"
                    strokeDasharray="4 4"
                    ifOverflow="extendDomain"
                  />
                  <Scatter name="Within range" data={inRangePoints} fill="#5CCC5C" />
                  <Scatter name="Outside range" data={outRangePoints} fill="#FFB400" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Model card */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, marginBottom: 4, color: C.offWhite }}>
            Model Details
          </h3>
          <p style={{ color: C.midGray, fontSize: 12, marginBottom: 18 }}>
            From training metadata
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13 }}>
            <ModelDetailRow label="Algorithm"        value={winningModel || "—"} mono />
            <ModelDetailRow label="Training rows"    value={datasetRows ? datasetRows.toLocaleString() : "—"} mono />
            <ModelDetailRow label="Trained at"       value={trainedAt ? new Date(trainedAt).toLocaleDateString("en-PK") : "—"} />
            <ModelDetailRow label="R² score"         value={r2 != null ? r2.toFixed(4) : "—"} mono />
            <ModelDetailRow label="MAE"              value={mae != null ? fmtPKR(mae) : "—"} mono />
            <ModelDetailRow label="RMSE"             value={rmse != null ? fmtPKR(rmse) : "—"} mono />
          </div>
        </div>
      </div>

      {/* Regional accuracy */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, marginBottom: 4, color: C.offWhite }}>
          Accuracy by Destination
        </h3>
        <p style={{ color: C.midGray, fontSize: 12, marginBottom: 18 }}>
          Average drift between ML prediction and Gemini estimate, per region. Lower drift = better agreement.
        </p>

        {regions.length === 0 ? (
          <div style={{ color: C.midGray, fontSize: 13, textAlign: "center", padding: "20px 0" }}>
            No regional data yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {regions.map((r, i) => {
              const maxDrift = Math.max(...regions.map((x) => x.avgAbsDeltaPercent), 25);
              const widthPct = (r.avgAbsDeltaPercent / maxDrift) * 100;
              const driftColor = r.avgAbsDeltaPercent <= 15
                ? "#5CCC5C"
                : r.avgAbsDeltaPercent <= 25
                ? "#FFB400"
                : "#FF8080";
              return (
                <div key={`${r.destination}-${i}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: C.offWhite, fontWeight: 500, textTransform: "capitalize" }}>
                      {r.destination}
                    </span>
                    <span style={{ fontSize: 11, color: C.midGray, fontFamily: "'DM Mono', monospace" }}>
                      {r.tripCount} {r.tripCount === 1 ? "trip" : "trips"} · drift {r.avgAbsDeltaPercent}%
                    </span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                    <div style={{
                      width: `${widthPct}%`,
                      height: "100%",
                      background: driftColor,
                      borderRadius: 3,
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.midGray }}>
                    <span>Predicted avg: {fmtPKR(r.avgPredicted)}</span>
                    <span>Gemini avg: {fmtPKR(r.avgActual)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Methodology card */}
      <div className="card" style={{ padding: 18, background: "rgba(168,119,212,0.04)", border: "1px solid rgba(168,119,212,0.15)" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{ fontSize: 18 }}>🧠</div>
          <div style={{ fontSize: 12, color: C.midGray, lineHeight: 1.5 }}>
            <strong style={{ color: C.offWhite }}>About this model.</strong> The cost-prediction model was trained on a synthetic Pakistan trips dataset using gradient boosting regression. Inputs include destination, days, group size, vehicle type, season, and traveler tier. The model produces a point estimate plus a confidence range derived from its test-set RMSE. When a user generates an itinerary, the model's prediction is compared to Gemini's total cost estimate; if they diverge by more than 25%, the user sees a transparency banner explaining the divergence. This dashboard tracks how often that validation succeeds in production.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function ModelDetailRow({ label, value, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ color: C.midGray, fontSize: 12 }}>{label}</span>
      <span style={{
        color: C.offWhite,
        fontSize: 13,
        fontFamily: mono ? "'DM Mono', monospace" : "'DM Sans', sans-serif",
      }}>
        {value}
      </span>
    </div>
  );
}