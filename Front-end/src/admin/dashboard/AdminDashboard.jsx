import { C } from "../../styles/colors";
import { Icon } from "../../components/Icon";

export default function AdminDashboard({ stats, users, trips, bookings }) {
  const { totalUsers=0, activeTrips=0, aiCalls=0, revenue="PKR 0", userGrowth=0, tripGrowth=0, proUsers=0, regions=[], monthlyData=[] } = stats;

  const statCards = [
    { label: "Total Users",        value: totalUsers, growth: `${userGrowth >= 0 ? "+" : ""}${userGrowth}%`, icon: <Icon.user /> },
    { label: "Total Itineraries",  value: activeTrips, growth: `${tripGrowth >= 0 ? "+" : ""}${tripGrowth}%`, icon: <Icon.map /> },
    { label: "AI Calls (Gemini)",  value: aiCalls,    growth: `= ${activeTrips} trips`, icon: <Icon.sparkle /> },
    { label: "Revenue (Paid)",     value: revenue,    growth: `${proUsers} Pro users`, icon: <Icon.dollar /> },
  ];

  const maxMonthly = Math.max(...monthlyData, 1);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const currentMonthIndex = new Date().getMonth();
  const chartMonths = Array.from({length:12},(_,i) => months[(currentMonthIndex - 11 + i + 12) % 12]);

  return (
    <div className="anim-fadeIn">
      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
        {statCards.map((s) => (
          <div key={s.label} className="card" style={{ padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ color: C.midGray }}>{s.icon}</div>
              <div style={{ fontSize: 12, color: s.growth.startsWith("+") ? "#5CCC5C" : s.growth.startsWith("-") ? C.crimson : "#FFB400", fontWeight: 700, background: s.growth.startsWith("+") ? "rgba(50,180,50,0.1)" : s.growth.startsWith("-") ? "rgba(140,50,50,0.1)" : "rgba(255,180,0,0.1)", padding: "3px 8px", borderRadius: 4 }}>
                {s.growth}
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Playfair Display', serif", marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: C.midGray }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* Monthly Chart */}
        <div className="card" style={{ padding: 28 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 20 }}>Monthly Itineraries Generated</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 160 }}>
            {monthlyData.map((v, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                <div style={{ fontSize: 9, color: C.midGray }}>{v || ""}</div>
                <div style={{ width: "100%", background: i === 11 ? C.crimson : "rgba(140,50,50,0.3)", borderRadius: "3px 3px 0 0", height: `${Math.max((v/maxMonthly)*100, v > 0 ? 4 : 0)}%`, transition: "height 0.5s ease", minHeight: v > 0 ? 4 : 0 }} />
                <div style={{ fontSize: 9, color: C.midGray }}>{chartMonths[i]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Regional Activity — real data from DB */}
        <div className="card" style={{ padding: 28 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 20 }}>Top Destinations</h3>
          {regions.length === 0 ? (
            <div style={{ color: C.midGray, fontSize: 13, textAlign: "center", padding: "20px 0" }}>No trips data yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {regions.map((r, i) => {
                const maxCount = Math.max(...regions.map(x => x.count), 1);
                return (
                  <div key={r.region}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{r.region}</span>
                      <span style={{ fontSize: 12, color: C.midGray }}>{r.count} trips</span>
                    </div>
                    <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${(r.count/maxCount)*100}%`, background: i === 0 ? C.crimson : `rgba(140,50,50,${0.8 - i*0.12})`, borderRadius: 3, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, marginBottom: 16 }}>Recent Users</h3>
          {users.slice(0, 5).map((u) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: C.midGray }}>{u.email}</div>
              </div>
              <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 4, background: u.plan === "pro" ? "rgba(50,180,50,0.15)" : "rgba(255,255,255,0.05)", color: u.plan === "pro" ? "#5CCC5C" : C.midGray }}>{u.plan === "pro" ? "Pro" : "Free"}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, marginBottom: 16 }}>Recent Itineraries</h3>
          {trips.slice(0, 5).map((t) => (
            <div key={t._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{t.destination}</div>
                <div style={{ fontSize: 12, color: C.midGray }}>{t.origin} · {t.days} days</div>
              </div>
              <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 4, background: t.status === "completed" ? "rgba(50,180,50,0.15)" : "rgba(140,50,50,0.12)", color: t.status === "completed" ? "#5CCC5C" : C.crimson }}>{t.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
