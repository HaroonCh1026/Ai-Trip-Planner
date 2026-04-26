import { useState, useMemo } from "react";
import { C } from "../../styles/colors";
import { Icon } from "../../components/Icon";

export default function AdminTrips({ trips, onViewTrip }) {
  const [search, setSearch]     = useState("");
  const [sortBy, setSortBy]     = useState("newest");
  const [filterStatus, setFilterStatus] = useState("all");
  const [view, setView]         = useState("grid"); // "grid" | "table" | "analytics"

  const filtered = useMemo(() => {
    let list = [...trips];
    if (search) list = list.filter(t =>
      (t.destination||"").toLowerCase().includes(search.toLowerCase()) ||
      (t.origin||"").toLowerCase().includes(search.toLowerCase()) ||
      (t.userId?.name||"").toLowerCase().includes(search.toLowerCase())
    );
    if (filterStatus !== "all") list = list.filter(t => t.status === filterStatus);
    switch (sortBy) {
      case "newest": list.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)); break;
      case "oldest": list.sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt)); break;
      case "budget_high": list.sort((a,b) => (b.budget||0)-(a.budget||0)); break;
      case "budget_low":  list.sort((a,b) => (a.budget||0)-(b.budget||0)); break;
      case "days_high": list.sort((a,b) => (b.days||0)-(a.days||0)); break;
    }
    return list;
  }, [trips, search, sortBy, filterStatus]);

  // ── Analytics data ──────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    if (!trips.length) return null;
    const totalBudget   = trips.reduce((s,t) => s+(t.budget||0), 0);
    const avgBudget     = Math.round(totalBudget / trips.length);
    const avgDays       = Math.round(trips.reduce((s,t) => s+(t.days||0), 0) / trips.length);
    const completed     = trips.filter(t => t.status === "completed").length;
    const upcoming      = trips.filter(t => !t.status || t.status === "upcoming").length;
    const cancelled     = trips.filter(t => t.status === "cancelled").length;
    const destCounts    = {};
    trips.forEach(t => { if (t.destination) destCounts[t.destination] = (destCounts[t.destination]||0)+1; });
    const topDests = Object.entries(destCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const originCounts  = {};
    trips.forEach(t => { if (t.origin) originCounts[t.origin] = (originCounts[t.origin]||0)+1; });
    const topOrigins = Object.entries(originCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const budgetBuckets = { "0-20K": 0, "20K-50K": 0, "50K-100K": 0, "100K+": 0 };
    trips.forEach(t => {
      const b = t.budget||0;
      if (b < 20000) budgetBuckets["0-20K"]++;
      else if (b < 50000) budgetBuckets["20K-50K"]++;
      else if (b < 100000) budgetBuckets["50K-100K"]++;
      else budgetBuckets["100K+"]++;
    });
    return { totalBudget, avgBudget, avgDays, completed, upcoming, cancelled, topDests, topOrigins, budgetBuckets };
  }, [trips]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-PK",{month:"short",day:"numeric",year:"numeric"}) : "—";
  const statusColor = (s) => s==="completed" ? "#5CCC5C" : s==="cancelled" ? C.midGray : C.crimson;
  const statusBg = (s) => s==="completed" ? "rgba(50,180,50,0.12)" : s==="cancelled" ? "rgba(255,255,255,0.05)" : "rgba(140,50,50,0.12)";

  return (
    <div className="anim-fadeIn">
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:28 }}>
        <div>
          <p className="section-label">Admin Panel</p>
          <h2 className="display-heading" style={{ fontSize:28 }}>Trip Analytics</h2>
          <p style={{ color:C.midGray, fontSize:14, marginTop:4 }}>{trips.length} total itineraries · {analytics?.completed||0} completed</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {["grid","table","analytics"].map(v => (
            <button key={v} onClick={()=>setView(v)} style={{ padding:"8px 16px", borderRadius:6, border:`1.5px solid ${view===v?C.crimson:"rgba(255,255,255,0.1)"}`, background:view===v?"rgba(140,50,50,0.12)":"transparent", color:view===v?C.crimson:C.midGray, cursor:"pointer", fontSize:13, fontWeight:500, fontFamily:"'DM Sans',sans-serif", textTransform:"capitalize" }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <input placeholder="Search destination, origin or user..." value={search} onChange={(e)=>setSearch(e.target.value)} style={{ paddingLeft:40 }} />
          <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:C.midGray }}>🔍</span>
        </div>
        <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)} style={{ padding:"10px 14px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:6, color:C.offWhite, fontFamily:"'DM Sans',sans-serif", fontSize:13 }}>
          {[["all","All Statuses"],["upcoming","Upcoming"],["completed","Completed"],["cancelled","Cancelled"]].map(([v,l])=><option key={v} value={v} style={{background:"#1a1a1a"}}>{l}</option>)}
        </select>
        <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} style={{ padding:"10px 14px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:6, color:C.offWhite, fontFamily:"'DM Sans',sans-serif", fontSize:13 }}>
          {[["newest","Newest First"],["oldest","Oldest First"],["budget_high","Budget: High→Low"],["budget_low","Budget: Low→High"],["days_high","Longest Duration"]].map(([v,l])=><option key={v} value={v} style={{background:"#1a1a1a"}}>{l}</option>)}
        </select>
      </div>

      {/* ── ANALYTICS VIEW ── */}
      {view === "analytics" && analytics && (
        <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
          {/* KPI Row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:16 }}>
            {[
              { label:"Avg Budget",   value:`PKR ${analytics.avgBudget.toLocaleString()}`, icon:"💰" },
              { label:"Avg Duration", value:`${analytics.avgDays} days`,   icon:"🗓️" },
              { label:"Completed",    value:analytics.completed,           icon:"✅" },
              { label:"Upcoming",     value:analytics.upcoming,            icon:"🔜" },
              { label:"Cancelled",    value:analytics.cancelled,           icon:"❌" },
              { label:"Total Budget", value:`PKR ${(analytics.totalBudget/1000).toFixed(0)}K`, icon:"📊" },
            ].map(({ label, value, icon }) => (
              <div key={label} className="card" style={{ padding:"20px 22px" }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{icon}</div>
                <div style={{ fontSize:22, fontWeight:700, fontFamily:"'Playfair Display',serif", marginBottom:4 }}>{value}</div>
                <div style={{ fontSize:12, color:C.midGray }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
            {/* Top Destinations */}
            <div className="card" style={{ padding:28 }}>
              <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, marginBottom:20 }}>Top Destinations</h3>
              {analytics.topDests.map(([dest, count], i) => (
                <div key={dest} style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontSize:13, fontWeight:500 }}>{i+1}. {dest}</span>
                    <span style={{ fontSize:12, color:C.midGray }}>{count} trips ({Math.round(count/trips.length*100)}%)</span>
                  </div>
                  <div style={{ height:5, background:"rgba(255,255,255,0.06)", borderRadius:3 }}>
                    <div style={{ height:"100%", width:`${(count/analytics.topDests[0][1])*100}%`, background:`rgba(140,50,50,${1-i*0.1})`, borderRadius:3, transition:"width 0.5s ease" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Budget Distribution */}
            <div className="card" style={{ padding:28 }}>
              <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, marginBottom:20 }}>Budget Distribution</h3>
              {Object.entries(analytics.budgetBuckets).map(([range, count]) => {
                const pct = trips.length ? Math.round((count/trips.length)*100) : 0;
                return (
                  <div key={range} style={{ marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:13, fontWeight:500 }}>PKR {range}</span>
                      <span style={{ fontSize:12, color:C.midGray }}>{count} trips ({pct}%)</span>
                    </div>
                    <div style={{ height:8, background:"rgba(255,255,255,0.06)", borderRadius:4 }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:C.crimson, borderRadius:4, transition:"width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ height:1, background:"rgba(255,255,255,0.06)", margin:"20px 0" }} />
              <h4 style={{ fontSize:14, marginBottom:14, color:C.midGray }}>Top Origins</h4>
              {analytics.topOrigins.map(([origin, count]) => (
                <div key={origin} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize:13 }}>{origin}</span>
                  <span style={{ fontSize:12, color:C.midGray }}>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status breakdown */}
          <div className="card" style={{ padding:28 }}>
            <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, marginBottom:20 }}>Trip Status Overview</h3>
            <div style={{ display:"flex", gap:8, height:32 }}>
              {[["upcoming",analytics.upcoming,C.crimson],["completed",analytics.completed,"#5CCC5C"],["cancelled",analytics.cancelled,C.midGray]].map(([status,count,color])=>{
                const pct = trips.length ? (count/trips.length)*100 : 0;
                return pct > 0 ? (
                  <div key={status} title={`${status}: ${count}`} style={{ flex:pct, background:color, borderRadius:4, position:"relative", overflow:"hidden", cursor:"default" }}>
                    {pct > 12 && <span style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)", fontSize:11, fontWeight:700, color:"#fff", whiteSpace:"nowrap" }}>{Math.round(pct)}%</span>}
                  </div>
                ) : null;
              })}
            </div>
            <div style={{ display:"flex", gap:20, marginTop:12 }}>
              {[["Upcoming",analytics.upcoming,C.crimson],["Completed",analytics.completed,"#5CCC5C"],["Cancelled",analytics.cancelled,C.midGray]].map(([label,count,color])=>(
                <div key={label} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:color }} />
                  <span style={{ color:C.midGray }}>{label}:</span> <strong>{count}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {view === "table" && (
        <div className="card" style={{ overflow:"hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding:"48px 32px", textAlign:"center", color:C.midGray, fontSize:14 }}>No trips match your filters.</div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"rgba(255,255,255,0.02)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                  {["DESTINATION","USER","ORIGIN","DAYS","BUDGET","STATUS","DATE",""].map(h=>(
                    <th key={h} style={{ padding:"14px 20px", fontSize:11, color:C.midGray, fontWeight:600, textAlign:"left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((trip) => (
                  <tr key={trip._id} style={{ borderBottom:"1px solid rgba(255,255,255,0.03)", cursor:"pointer" }}
                    onMouseEnter={(e)=>(e.currentTarget.style.background="rgba(140,50,50,0.04)")}
                    onMouseLeave={(e)=>(e.currentTarget.style.background="transparent")}>
                    <td style={{ padding:"13px 20px", fontWeight:600, fontSize:14 }}>{trip.destination}</td>
                    <td style={{ padding:"13px 20px", fontSize:12, color:C.midGray }}>{trip.userId?.name||"—"}</td>
                    <td style={{ padding:"13px 20px", fontSize:13, color:C.midGray }}>{trip.origin}</td>
                    <td style={{ padding:"13px 20px", fontSize:13 }}>{trip.days}d</td>
                    <td style={{ padding:"13px 20px", fontSize:13, fontWeight:600 }}>PKR {(trip.budget||0).toLocaleString()}</td>
                    <td style={{ padding:"13px 20px" }}>
                      <span style={{ padding:"3px 10px", borderRadius:4, fontSize:11, fontWeight:700, background:statusBg(trip.status), color:statusColor(trip.status) }}>
                        {trip.status||"upcoming"}
                      </span>
                    </td>
                    <td style={{ padding:"13px 20px", fontSize:12, color:C.midGray }}>{fmtDate(trip.createdAt)}</td>
                    <td style={{ padding:"13px 20px" }}>
                      <button onClick={()=>onViewTrip(trip)} className="btn-secondary" style={{ padding:"5px 12px", fontSize:11 }}>Inspect</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {view === "grid" && (
        filtered.length === 0 ? (
          <div className="card" style={{ padding:"48px 32px", textAlign:"center", color:C.midGray, fontSize:14 }}>No trips match your filters.</div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:20 }}>
            {filtered.map((trip) => (
              <div key={trip._id} className="card hover-lift" style={{ overflow:"hidden", cursor:"pointer" }} onClick={()=>onViewTrip(trip)}>
                <div style={{ height:140, position:"relative" }}>
                  <img src={trip.image} alt={trip.destination}
                    onError={(e)=>{e.target.src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Hunza_Valley_Pakistan.jpg/800px-Hunza_Valley_Pakistan.jpg";}}
                    style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }} />
                  <div style={{ position:"absolute", top:12, right:12 }}>
                    <span style={{ background:statusBg(trip.status), color:statusColor(trip.status), padding:"3px 10px", borderRadius:4, fontSize:11, fontWeight:700 }}>
                      {trip.status||"upcoming"}
                    </span>
                  </div>
                  <div style={{ position:"absolute", bottom:12, left:16 }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700 }}>{trip.destination}</div>
                    <div style={{ fontSize:11, color:"rgba(242,242,242,0.7)" }}>{trip.origin} · {trip.days} days</div>
                  </div>
                </div>
                <div style={{ padding:"16px 20px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <span style={{ fontSize:12, color:C.midGray }}>
                      {trip.userId?.name ? `👤 ${trip.userId.name}` : "Anonymous"}
                    </span>
                    <span style={{ fontSize:14, fontWeight:700, color:C.crimson }}>
                      PKR {(trip.budget||0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:12, color:C.midGray }}>{fmtDate(trip.createdAt)}</span>
                    <button className="btn-secondary" style={{ padding:"5px 12px", fontSize:11 }} onClick={(e)=>{e.stopPropagation();onViewTrip(trip);}}>
                      Inspect Architecture
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {filtered.length > 0 && (
        <div style={{ marginTop:20, textAlign:"right", fontSize:13, color:C.midGray }}>
          Showing {filtered.length} of {trips.length} trips
        </div>
      )}
    </div>
  );
}
