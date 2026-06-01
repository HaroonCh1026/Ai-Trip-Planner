import { useState, useMemo } from "react";
import { C } from "../../styles/colors";
import api from "../../api/client";

export default function AdminBookings({ bookings = [], bookingMeta = {} }) { // eslint-disable-line no-unused-vars
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all");
  const [sortBy, setSortBy]   = useState("newest");

  // Optimistic status overrides after an admin cancels a booking, so the row
  // updates immediately without waiting for a full data refresh.
  const [overrides, setOverrides] = useState({});
  const [busyId, setBusyId]       = useState(null);
  const [note, setNote]           = useState("");

  // Cancel a paid booking: confirm, hit the admin endpoint (which emails the
  // traveller and marks it Cancelled), then reflect it in the table.
  const cancelBooking = async (b) => {
    const st = overrides[b.id] || b.status;
    if (st !== "Paid") return;
    if (!window.confirm(
      `Cancel booking ${b.id} for ${b.user}?\n\nThe traveller will be emailed that their trip is cancelled and a refund of ${b.amount} is being processed.`
    )) return;
    setBusyId(b.id);
    setNote("");
    try {
      await api.patch(`/admin/bookings/${b.id}/cancel`);
      setOverrides((o) => ({ ...o, [b.id]: "Cancelled" }));
      setNote(`Booking ${b.id} cancelled. The traveller has been notified and a refund is being processed.`);
    } catch (e) {
      setNote(e?.response?.data?.message || "Could not cancel this booking. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

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

  const statusPill = (status) => (
    <span style={{
      padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:"nowrap",
      background:STATUS_STYLE[status]?.bg||"rgba(255,255,255,0.06)",
      color:STATUS_STYLE[status]?.color||C.midGray
    }}>
      {status||"—"}
    </span>
  );

  const planPill = (plan) => (
    <span style={{
      fontSize:11, padding:"3px 8px", borderRadius:4, whiteSpace:"nowrap",
      background:plan==="pro"?"rgba(50,180,50,0.12)":"rgba(255,255,255,0.05)",
      color:plan==="pro"?"#5CCC5C":C.midGray,
    }}>
      {plan==="pro" ? "⭐ Pro" : "Free"}
    </span>
  );

  return (
    <div className="anim-fadeIn">
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <p className="section-label">Admin Panel</p>
        <h2 className="display-heading" style={{ fontSize:28 }}>Booking & Revenue Stream</h2>
        <p style={{ color:C.midGray, fontSize:14, marginTop:4 }}>{bookings.length} total transactions tracked</p>
      </div>

      {/* Revenue KPI Cards */}
      <div
        className="vai-admin-kpi-grid"
        style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:16, marginBottom:32 }}
      >
        {[
          { label:"Total Revenue",  value:`PKR ${totalRevenue.toLocaleString()}`, icon:"💵", color:"#5CCC5C" },
          { label:"Paid Bookings",  value:paidCount,   icon:"✅", color:"#5CCC5C" },
          { label:"Pending",        value:pendingCount, icon:"⏳", color:"#FFB400" },
          { label:"Pro Users",      value:proUsers,     icon:"⭐", color:C.crimson  },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="card" style={{ padding:"20px 24px" }}>
            <div style={{ fontSize:28, marginBottom:8 }}>{icon}</div>
            <div style={{ fontSize:22, fontWeight:700, fontFamily:"'Playfair Display',serif", color, marginBottom:4, wordBreak:"break-word" }}>{value}</div>
            <div style={{ fontSize:12, color:C.midGray }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="vai-admin-filter-row" style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
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

      {note && (
        <div style={{
          marginBottom:16, padding:"10px 14px", borderRadius:6, fontSize:13,
          background:"rgba(140,50,50,0.08)", border:"1px solid rgba(140,50,50,0.3)", color:C.offWhite,
        }}>
          {note}
        </div>
      )}

      {/* Table + mobile cards */}
      <div className="card vai-admin-table-wrap" style={{ overflow:"hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding:"48px 32px", textAlign:"center", color:C.midGray, fontSize:14 }}>No transactions found.</div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="vai-admin-table" style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"rgba(255,255,255,0.02)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                  {["BOOKING ID","USER","EMAIL","PLAN","TRIP","AMOUNT","DATE","STATUS","ACTIONS"].map(h=>(
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
                    <td style={{ padding:"13px 18px" }}>{planPill(b.userPlan)}</td>
                    <td style={{ padding:"13px 18px", fontSize:13 }}>{b.trip||"—"}</td>
                    <td style={{ padding:"13px 18px", fontSize:14, fontWeight:700, color:b.status==="Paid"?"#5CCC5C":C.offWhite }}>{b.amount||"—"}</td>
                    <td style={{ padding:"13px 18px", fontSize:12, color:C.midGray, whiteSpace:"nowrap" }}>{b.date||"—"}</td>
                    <td style={{ padding:"13px 18px" }}>{statusPill(overrides[b.id] || b.status)}</td>
                    <td style={{ padding:"13px 18px", whiteSpace:"nowrap" }}>
                      {(overrides[b.id] || b.status) === "Paid" ? (
                        <button
                          onClick={() => cancelBooking(b)}
                          disabled={busyId === b.id}
                          style={{
                            padding:"6px 12px", fontSize:12, fontWeight:600,
                            background:"transparent", border:`1px solid rgba(140,50,50,0.5)`,
                            borderRadius:6, color:C.crimson,
                            cursor: busyId === b.id ? "default" : "pointer",
                            opacity: busyId === b.id ? 0.6 : 1,
                          }}
                        >
                          {busyId === b.id ? "Cancelling…" : "Cancel & refund"}
                        </button>
                      ) : (
                        <span style={{ fontSize:12, color:C.midGray }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="vai-admin-cards">
              {filtered.map((b, i) => (
                <div key={b.id || i} className="vai-admin-row-card">
                  <div className="vai-row-head">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.offWhite, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {b.user || "—"}
                      </div>
                      <div style={{ fontSize: 11, color: C.midGray, marginTop: 2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {b.userEmail || "—"}
                      </div>
                    </div>
                    {statusPill(b.status)}
                  </div>

                  <dl className="vai-row-meta">
                    <dt>Booking</dt>
                    <dd style={{ fontFamily: "'DM Mono', monospace", fontSize: 11 }}>{b.id || "—"}</dd>
                    <dt>Trip</dt>
                    <dd>{b.trip || "—"}{b.days && b.days !== "—" ? ` · ${b.days}d` : ""}</dd>
                    <dt>Plan</dt>
                    <dd>{planPill(b.userPlan)}</dd>
                    <dt>Amount</dt>
                    <dd style={{ fontWeight: 700, color: b.status === "Paid" ? "#5CCC5C" : C.offWhite, fontSize: 14 }}>
                      {b.amount || "—"}
                    </dd>
                    <dt>Date</dt>
                    <dd>{b.date || "—"}</dd>
                  </dl>
                </div>
              ))}
            </div>
          </>
        )}
        {filtered.length > 0 && (
          <div style={{ padding:"12px 18px", borderTop:"1px solid rgba(255,255,255,0.05)", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <span style={{ fontSize:13, color:C.midGray }}>Showing {filtered.length} of {bookings.length} transactions</span>
            <span style={{ fontSize:13, color:"#5CCC5C", fontWeight:600 }}>Total Paid: PKR {totalRevenue.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}