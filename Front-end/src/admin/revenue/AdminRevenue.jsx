import { useEffect, useState } from "react";
import { C } from "../../styles/colors";
import { Icon } from "../../components/Icon";
import api from "../../api/client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const fmtPKR = (n) => `PKR ${Math.round(n || 0).toLocaleString()}`;
const fmtPKRcompact = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
};

export default function AdminRevenue() {
  const [summary, setSummary]           = useState(null);
  const [monthly, setMonthly]           = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [s, m, d] = await Promise.all([
          api.get("/admin/revenue/summary"),
          api.get("/admin/revenue/monthly"),
          api.get("/admin/revenue/by-destination"),
        ]);
        if (cancelled) return;
        setSummary(s.data.data);
        setMonthly(m.data.data?.months || []);
        setDestinations(d.data.data?.destinations || []);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || "Failed to load revenue analytics.");
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
          <h2 className="display-heading" style={{ fontSize: 28 }}>Revenue Analytics</h2>
        </div>
        <div className="card" style={{ padding: 40, textAlign: "center", color: C.midGray }}>
          Loading revenue data…
        </div>
      </div>
    );
  }

  const hasData = summary && summary.paidBookings > 0;

  const statCards = summary
    ? [
        {
          label: "Gross Booking Value",
          value: fmtPKR(summary.gmv),
          sub: `${summary.paidBookings} paid bookings`,
          icon: <Icon.dollar />,
          accent: C.crimson,
        },
        {
          label: "Net Revenue (Fees)",
          value: fmtPKR(summary.feeRevenue),
          sub: `${summary.impliedTakeRatePercent}% effective take`,
          icon: <Icon.sparkle />,
          accent: "#A877D4",
        },
        {
          label: "Avg Booking Value",
          value: fmtPKR(summary.avgBookingValue),
          sub: `${fmtPKR(summary.avgFeePerBooking)} avg fee`,
          icon: <Icon.map />,
          accent: "#5CCC5C",
        },
        {
          label: "Conversion",
          value: summary.totalBookings > 0
            ? `${Math.round((summary.paidBookings / summary.totalBookings) * 100)}%`
            : "—",
          sub: `${summary.paidBookings}/${summary.totalBookings} paid`,
          icon: <Icon.shield />,
          accent: "#FFB400",
        },
      ]
    : [];

  const maxDestGmv = Math.max(...destinations.map((d) => d.gmv), 1);

  return (
    <div className="anim-fadeIn">
      <div style={{ marginBottom: 24 }}>
        <p className="section-label">Operations</p>
        <h2 className="display-heading" style={{ fontSize: 28 }}>Revenue Analytics</h2>
        <p style={{ color: C.midGray, fontSize: 13, marginTop: 6, maxWidth: 720 }}>
          Gross Booking Value (GMV) is the total flowing through the platform; Net Revenue is what VoyageurAI keeps from service fees.
        </p>
      </div>

      {error && (
        <div role="alert" style={{ marginBottom: 20, padding: 12, color: "#FF8080", background: "rgba(255,128,128,0.08)", border: "1px solid rgba(255,128,128,0.4)", borderRadius: 6, fontSize: 13 }}>
          {error}
        </div>
      )}

      {!hasData && !error && (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 6, color: C.offWhite }}>
            No paid bookings yet
          </h3>
          <p style={{ color: C.midGray, fontSize: 13, maxWidth: 480, margin: "0 auto" }}>
            Once users start booking trips, their revenue and destination patterns will appear here.
          </p>
        </div>
      )}

      {hasData && (
        <div
          className="vai-admin-grid-1col"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 24 }}
        >
          {statCards.map((s) => (
            <div key={s.label} className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 8 }}>
                <div style={{ color: s.accent, flexShrink: 0 }}>{s.icon}</div>
                <div style={{ fontSize: 11, color: C.midGray, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "right", minWidth: 0 }}>
                  {s.sub}
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", marginBottom: 4, color: C.offWhite, wordBreak: "break-word" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: C.midGray }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {hasData && (
        <div
          className="vai-admin-grid-1col"
          style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}
        >
          <div className="card" style={{ padding: 24, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, gap: 8, flexWrap: "wrap" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, color: C.offWhite }}>
                Monthly Revenue Trend
              </h3>
              <span style={{ fontSize: 11, color: C.midGray }}>Last 12 months</span>
            </div>
            <p style={{ color: C.midGray, fontSize: 12, marginBottom: 18 }}>
              GMV vs Net Revenue, paid bookings only.
            </p>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="shortLabel"
                    stroke={C.midGray}
                    tick={{ fontSize: 11, fill: C.midGray }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <YAxis
                    stroke={C.midGray}
                    tick={{ fontSize: 10, fill: C.midGray }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={fmtPKRcompact}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: "#1a1a1a",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 6,
                      fontSize: 12,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                    labelStyle={{ color: C.offWhite, marginBottom: 4 }}
                    itemStyle={{ color: C.offWhite }}
                    formatter={(value, name) => {
                      if (name === "GMV") return [fmtPKR(value), "GMV"];
                      if (name === "Net") return [fmtPKR(value), "Net Revenue"];
                      return [value, name];
                    }}
                    labelFormatter={(_, payload) => {
                      if (payload && payload[0]) return payload[0].payload.label;
                      return "";
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: C.midGray, paddingTop: 8 }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar dataKey="gmv"        name="GMV" fill={C.crimson} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="feeRevenue" name="Net" fill="#A877D4"   radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card" style={{ padding: 24, minWidth: 0 }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, marginBottom: 4, color: C.offWhite }}>
              Top Destinations
            </h3>
            <p style={{ color: C.midGray, fontSize: 12, marginBottom: 18 }}>
              By gross booking value
            </p>
            {destinations.length === 0 ? (
              <div style={{ color: C.midGray, fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                No destination data yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {destinations.map((d, i) => {
                  const widthPct = (d.gmv / maxDestGmv) * 100;
                  return (
                    <div key={`${d.destination}-${i}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, color: C.offWhite, fontWeight: 500, textTransform: "capitalize", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth: 0 }}>
                          {d.destination}
                        </span>
                        <span style={{ fontSize: 11, color: C.midGray, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
                          {d.bookings} {d.bookings === 1 ? "booking" : "bookings"}
                        </span>
                      </div>
                      <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                        <div style={{
                          width: `${widthPct}%`,
                          height: "100%",
                          background: `linear-gradient(90deg, ${C.crimson} 0%, #d4587a 100%)`,
                          borderRadius: 3,
                          transition: "width 0.5s ease",
                        }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.midGray, gap: 8, flexWrap: "wrap" }}>
                        <span>GMV: {fmtPKR(d.gmv)}</span>
                        <span style={{ color: "#A877D4" }}>Net: {fmtPKR(d.feeRevenue)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {hasData && (
        <div className="card" style={{ padding: 18, background: "rgba(168,119,212,0.04)", border: "1px solid rgba(168,119,212,0.15)" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ fontSize: 18 }}>💡</div>
            <div style={{ fontSize: 12, color: C.midGray, lineHeight: 1.5 }}>
              <strong style={{ color: C.offWhite }}>Why two metrics?</strong> Gross Booking Value measures total demand on the platform — how much money users are spending overall. Net Revenue is what VoyageurAI actually keeps after vendor payouts (currently a {summary?.impliedTakeRatePercent || 8}% service fee). Investors and growth metrics look at GMV; sustainability and unit economics look at Net Revenue.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}