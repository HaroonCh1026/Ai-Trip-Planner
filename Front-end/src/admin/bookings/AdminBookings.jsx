import { useState, useMemo } from "react";
import { C } from "../../styles/colors";

export default function AdminBookings({ bookings = [], bookingMeta = {} }) {
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all");
  const [sortBy, setSortBy]   = useState("newest");

  const filtered = useMemo(() => {
    let list = [...bookings];
    if (search) list = list.filter(b =>
      (b.user||"").toLowerCase().includes(search.toLowerCase()) ||
      (b.userEmail||"").toLowerCase().includes(search.toLowerCase()) ||
      (b.trip||"").toLowerCase().includes(search.toLowerCase()) ||
      (b.id||"").toLowerCase().includes(search.toLowerCase())
    );
    if (filter !== "all") list = list.filter(b => b.status === filter);
    if (sortBy === "newest") list.sort((a,b) => new Date(b.date)-new Date(a.date));
    if (sortBy === "amount_high") list.sort((a,b) => (b.amountRaw||0)-(a.amountRaw||0));
    if (sortBy === "amount_low") list.sort((a,b) => (a.amountRaw||0)-(b.amountRaw||0));
    return list;
  }, [bookings, search, filter, sortBy]);

  const totalRevenue = bookings.filter(b=>b.status==="Paid").reduce((s,b)=>s+(b.amountRaw||0),0);
  const paidCount    = bookings.filter(b=>b.status==="Paid").length;
  const pendingCount = bookings.filter(b=>b.status==="Pending").length;
  const proUsers     = [...new Set(bookings.filter(b=>b.userPlan==="pro").map(b=>b.user))].length;

  const STATUS_STYLE = {
    Paid:    { bg:"rgba(50,180,50,0.12)",   color:"#5CCC5C" },
    Pending: { bg:"rgba(255,180,0,0.12)",   color:"#FFB400" },
    Cancelled:{ bg:"rgba(140,50,50,0.12)", color:C.crimson  },
  };

  return (
    <div className="anim-fadeIn">
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <p className="section-label">Admin Panel</p>
        <h2 className="display-heading" style={{ fontSize:28 }}>Booking & Revenue Stream</h2>
        <p style={{ color:C.midGray, fontSize:14, marginTop:4 }}>{bookings.length} total transactions tracked</p>
      </div>

      {/* Revenue KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:16, marginBottom:32 }}>
        {[
          { label:"Total Revenue",  value:`PKR ${totalRevenue.toLocaleString()}`, icon:"💵", color:"#5CCC5C" },
          { label:"Paid Bookings",  value:paidCount,   icon:"✅", color:"#5CCC5C" },
          { label:"Pending",        value:pendingCount, icon:"⏳", color:"#FFB400" },
          { label:"Pro Users",      value:proUsers,     icon:"⭐", color:C.crimson  },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="card" style={{ padding:"20px 24px" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>{icon}</div>
            <div style={{ fontSize:24, fontWeight:700, fontFamily:"'Playfair Display',serif", color, marginBottom:4 }}>{value}</div>
            <div style={{ fontSize:12, color:C.midGray }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:220 }}>
          <input placeholder="Search by user, email, trip or booking ID..." value={search} onChange={(e)=>setSearch(e.target.value)} style={{ paddingLeft:40 }} />
          <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:C.midGray }}>🔍</span>
        </div>
        <select value={filter} onChange={(e)=>setFilter(e.target.value)} style={{ padding:"10px 14px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:6, color:C.offWhite, fontFamily:"'DM Sans',sans-serif", fontSize:13 }}>
          {[["all","All Status"],["Paid","Paid"],["Pending","Pending"],["Cancelled","Cancelled"]].map(([v,l])=><option key={v} value={v} style={{background:"#1a1a1a"}}>{l}</option>)}
        </select>
        <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} style={{ padding:"10px 14px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:6, color:C.offWhite, fontFamily:"'DM Sans',sans-serif", fontSize:13 }}>
          {[["newest","Newest First"],["amount_high","Amount: High→Low"],["amount_low","Amount: Low→High"]].map(([v,l])=><option key={v} value={v} style={{background:"#1a1a1a"}}>{l}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow:"hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding:"48px 32px", textAlign:"center", color:C.midGray, fontSize:14 }}>No transactions found.</div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"rgba(255,255,255,0.02)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                {["BOOKING ID","USER","EMAIL","PLAN","TRIP","AMOUNT","DATE","STATUS"].map(h=>(
                  <th key={h} style={{ padding:"14px 18px", fontSize:11, color:C.midGray, fontWeight:600, textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b,i) => (
                <tr key={b.id||i}
                  style={{ borderBottom:"1px solid rgba(255,255,255,0.03)" }}
                  onMouseEnter={(e)=>(e.currentTarget.style.background="rgba(140,50,50,0.04)")}
                  onMouseLeave={(e)=>(e.currentTarget.style.background="transparent")}>
                  <td style={{ padding:"13px 18px", fontSize:11, color:C.midGray, fontFamily:"'DM Mono',monospace" }}>{b.id||"—"}</td>
                  <td style={{ padding:"13px 18px" }}>
                    <div style={{ fontSize:14, fontWeight:600 }}>{b.user||"—"}</div>
                    <div style={{ fontSize:11, color:C.midGray, marginTop:1 }}>
                      {b.days && b.days !== "—" ? `${b.days}d trip` : "Subscription"}
                    </div>
                  </td>
                  <td style={{ padding:"13px 18px", fontSize:12, color:C.midGray }}>{b.userEmail||"—"}</td>
                  <td style={{ padding:"13px 18px" }}>
                    <span style={{ fontSize:11, padding:"3px 8px", borderRadius:4, background:b.userPlan==="pro"?"rgba(50,180,50,0.12)":"rgba(255,255,255,0.05)", color:b.userPlan==="pro"?"#5CCC5C":C.midGray }}>
                      {b.userPlan==="pro" ? "⭐ Pro" : "Free"}
                    </span>
                  </td>
                  <td style={{ padding:"13px 18px", fontSize:13 }}>{b.trip||"—"}</td>
                  <td style={{ padding:"13px 18px", fontSize:14, fontWeight:700, color:b.status==="Paid"?"#5CCC5C":C.offWhite }}>{b.amount||"—"}</td>
                  <td style={{ padding:"13px 18px", fontSize:12, color:C.midGray, whiteSpace:"nowrap" }}>{b.date||"—"}</td>
                  <td style={{ padding:"13px 18px" }}>
                    <span style={{ padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700, background:STATUS_STYLE[b.status]?.bg||"rgba(255,255,255,0.06)", color:STATUS_STYLE[b.status]?.color||C.midGray }}>
                      {b.status||"—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filtered.length > 0 && (
          <div style={{ padding:"12px 18px", borderTop:"1px solid rgba(255,255,255,0.05)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:13, color:C.midGray }}>Showing {filtered.length} of {bookings.length} transactions</span>
            <span style={{ fontSize:13, color:"#5CCC5C", fontWeight:600 }}>Total Paid: PKR {totalRevenue.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
