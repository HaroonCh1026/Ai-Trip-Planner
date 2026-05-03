import { useState, useRef } from "react";
import { C } from "../../styles/colors";
import api from "../../api/client";
import Toast from "../../components/ui/Toast";

const STATUS_STYLE = {
  Open:        { bg:"rgba(140,50,50,0.15)",  color:C.crimson  },
  "In Progress":{ bg:"rgba(255,180,0,0.12)",  color:"#FFB400" },
  Closed:      { bg:"rgba(255,255,255,0.05)", color:"#8C8C8C" },
};
const CAT_STYLE = {
  Technical:       "rgba(82,122,255,0.15)",
  Billing:         "rgba(255,180,50,0.15)",
  "General Inquiry":"rgba(100,200,120,0.15)",
  "Trip Issue":    "rgba(255,100,100,0.15)",
};

export default function AdminSupport({ tickets, setTickets, onReload }) {
  const [search,       setSearch]       = useState("");
  const [filter,       setFilter]       = useState("All");
  const [activeTicket, setActiveTicket] = useState(null);
  const [msgText,      setMsgText]      = useState("");
  const [sending,      setSending]      = useState(false);
  // Day 6: replace native alert() with styled toast
  const [toast,        setToast]        = useState(null);
  const msgEndRef = useRef();

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = (t.name||"").toLowerCase().includes(q) || (t.email||"").toLowerCase().includes(q) || (t.message||"").toLowerCase().includes(q);
    const matchFilter = filter === "All" || t.status === filter;
    return matchSearch && matchFilter;
  });

  const counts = { Open: tickets.filter(t=>t.status==="Open").length, "In Progress": tickets.filter(t=>t.status==="In Progress").length, Closed: tickets.filter(t=>t.status==="Closed").length };

  const openTicket = (t) => { setActiveTicket(t); setMsgText(""); setTimeout(() => msgEndRef.current?.scrollIntoView({behavior:"smooth"}), 100); };

  const sendMessage = async () => {
    if (!msgText.trim() || !activeTicket) return;
    setSending(true);
    try {
      const { data } = await api.post(`/admin/support/${activeTicket._id}/message`, { text: msgText, sender: "admin", senderName: "Support Team" });
      const updated = data.data.ticket;
      setActiveTicket(updated);
      setTickets(p => p.map(t => t._id === updated._id ? updated : t));
      setMsgText("");
      setTimeout(() => msgEndRef.current?.scrollIntoView({behavior:"smooth"}), 50);
    } catch (err) {
      setToast({ kind: "error", message: err.response?.data?.message || "Send failed." });
    }
    finally { setSending(false); }
  };

  const updateStatus = async (status) => {
    if (!activeTicket) return;
    try {
      await api.patch(`/admin/support/${activeTicket._id}`, { status });
      setActiveTicket(p => ({ ...p, status }));
      setTickets(p => p.map(t => t._id === activeTicket._id ? { ...t, status } : t));
      setToast({ kind: "success", message: `Ticket marked as ${status}.` });
    } catch {
      setToast({ kind: "error", message: "Status update failed." });
    }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString("en-PK",{month:"short",day:"numeric",year:"numeric"});
  const fmtTime = (d) => new Date(d).toLocaleTimeString("en-PK",{hour:"2-digit",minute:"2-digit"});

  return (
    <>
    <div className="anim-fadeIn">
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <p className="section-label">Admin Panel</p>
        <h2 className="display-heading" style={{ fontSize:28, marginBottom:6 }}>Support Tickets</h2>
        <div style={{ display:"flex", gap:20, fontSize:13 }}>
          <span style={{ color:C.crimson, fontWeight:600 }}>{counts.Open} Open</span>
          <span style={{ color:"#FFB400" }}>{counts["In Progress"]} In Progress</span>
          <span style={{ color:C.midGray }}>{counts.Closed} Closed</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:220 }}>
          <input placeholder="Search by name, email or message..." value={search} onChange={(e)=>setSearch(e.target.value)} style={{ paddingLeft:40 }} />
          <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:C.midGray }}>🔍</span>
        </div>
        {["All","Open","In Progress","Closed"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:"10px 16px", borderRadius:6, border:filter===f?`1.5px solid ${C.crimson}`:"1px solid rgba(255,255,255,0.08)", background:filter===f?"rgba(140,50,50,0.1)":"transparent", color:filter===f?C.crimson:C.midGray, cursor:"pointer", fontSize:13, fontWeight:500, fontFamily:"'DM Sans',sans-serif" }}>{f}</button>
        ))}
        <button onClick={onReload} style={{ padding:"10px 14px", background:"transparent", border:"1px solid rgba(255,255,255,0.08)", borderRadius:6, color:C.midGray, cursor:"pointer", fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>↻ Refresh</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:activeTicket?"1fr 460px":"1fr", gap:20 }}>
        {/* Ticket List */}
        <div className="card" style={{ overflow:"hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding:"48px 32px", textAlign:"center", color:C.midGray }}>No tickets found.</div>
          ) : filtered.map((ticket, i) => (
            <div key={ticket._id} onClick={()=>openTicket(ticket)}
              style={{ padding:"16px 20px", borderBottom:i<filtered.length-1?"1px solid rgba(255,255,255,0.05)":"none", cursor:"pointer", background:activeTicket?._id===ticket._id?"rgba(140,50,50,0.06)":"transparent", transition:"background 0.15s" }}
              onMouseEnter={(e)=>{ if(activeTicket?._id!==ticket._id) e.currentTarget.style.background="rgba(255,255,255,0.02)"; }}
              onMouseLeave={(e)=>{ if(activeTicket?._id!==ticket._id) e.currentTarget.style.background="transparent"; }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:ticket.status==="Closed"?C.midGray:ticket.status==="In Progress"?"#FFB400":C.crimson, flexShrink:0 }} />
                    <span style={{ fontWeight:600, fontSize:14 }}>{ticket.name}</span>
                    <span style={{ padding:"2px 8px", borderRadius:4, fontSize:11, background:CAT_STYLE[ticket.category]||"rgba(255,255,255,0.06)", color:C.offWhite, flexShrink:0 }}>{ticket.category}</span>
                  </div>
                  <p style={{ fontSize:12, color:C.midGray, marginBottom:3 }}>{ticket.email}</p>
                  <p style={{ fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ticket.message}</p>
                  {ticket.messages?.length > 1 && <p style={{ fontSize:11, color:C.midGray, marginTop:4 }}>💬 {ticket.messages.length} messages</p>}
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:4, fontSize:11, fontWeight:600, background:STATUS_STYLE[ticket.status]?.bg, color:STATUS_STYLE[ticket.status]?.color, marginBottom:4 }}>{ticket.status}</span>
                  <p style={{ fontSize:11, color:C.midGray }}>{fmtDate(ticket.createdAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Thread Panel */}
        {activeTicket && (
          <div className="card" style={{ display:"flex", flexDirection:"column", height:620, overflow:"hidden" }}>
            {/* Panel header */}
            <div style={{ padding:"18px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)", flexShrink:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:17, marginBottom:2 }}>{activeTicket.name}</h3>
                  <p style={{ fontSize:12, color:C.midGray, marginBottom:8 }}>{activeTicket.email}</p>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ padding:"3px 10px", borderRadius:4, fontSize:11, fontWeight:600, background:STATUS_STYLE[activeTicket.status]?.bg, color:STATUS_STYLE[activeTicket.status]?.color }}>{activeTicket.status}</span>
                    <span style={{ padding:"3px 10px", borderRadius:4, fontSize:11, background:CAT_STYLE[activeTicket.category]||"rgba(255,255,255,0.06)", color:C.offWhite }}>{activeTicket.category}</span>
                  </div>
                </div>
                <button onClick={()=>setActiveTicket(null)} style={{ background:"transparent", border:"none", color:C.midGray, cursor:"pointer", fontSize:18 }}>✕</button>
              </div>
              {/* Status controls */}
              <div style={{ display:"flex", gap:8, marginTop:12 }}>
                {["Open","In Progress","Closed"].filter(s=>s!==activeTicket.status).map(s=>(
                  <button key={s} onClick={()=>updateStatus(s)} style={{ padding:"5px 12px", background:"transparent", border:`1px solid ${STATUS_STYLE[s]?.color||C.midGray}`, borderRadius:4, color:STATUS_STYLE[s]?.color||C.midGray, cursor:"pointer", fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>
                    → {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
              {/* Original message always shown first if no messages array */}
              {(activeTicket.messages||[]).length === 0 && (
                <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:600, flexShrink:0 }}>
                    {activeTicket.name?.[0]||"U"}
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:C.midGray, marginBottom:4 }}>{activeTicket.name} · {fmtTime(activeTicket.createdAt)}</div>
                    <div style={{ padding:"10px 14px", borderRadius:"4px 12px 12px 12px", background:"rgba(255,255,255,0.06)", fontSize:13, lineHeight:1.6 }}>{activeTicket.message}</div>
                  </div>
                </div>
              )}
              {(activeTicket.messages||[]).map((msg,i)=>(
                <div key={i} style={{ display:"flex", flexDirection:msg.sender==="admin"?"row-reverse":"row", gap:10, alignItems:"flex-start" }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:msg.sender==="admin"?C.crimson:"rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:600, flexShrink:0 }}>
                    {msg.sender==="admin" ? "S" : (activeTicket.name?.[0]||"U")}
                  </div>
                  <div style={{ maxWidth:"75%" }}>
                    <div style={{ fontSize:11, color:C.midGray, marginBottom:4, textAlign:msg.sender==="admin"?"right":"left" }}>
                      {msg.senderName} · {fmtTime(msg.createdAt)}
                    </div>
                    <div style={{ padding:"10px 14px", borderRadius:msg.sender==="admin"?"12px 4px 12px 12px":"4px 12px 12px 12px", background:msg.sender==="admin"?C.crimson:"rgba(255,255,255,0.06)", fontSize:13, lineHeight:1.6 }}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={msgEndRef} />
            </div>

            {/* Reply input */}
            {activeTicket.status !== "Closed" ? (
              <div style={{ padding:"14px 20px", borderTop:"1px solid rgba(255,255,255,0.06)", display:"flex", gap:10, flexShrink:0 }}>
                <input value={msgText} onChange={(e)=>setMsgText(e.target.value)} placeholder="Reply to user..."
                  onKeyDown={(e)=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();} }}
                  style={{ flex:1 }} />
                <button className="btn-primary" style={{ padding:"10px 18px", fontSize:13 }} onClick={sendMessage} disabled={sending||!msgText.trim()}>
                  {sending?"...":"Send"}
                </button>
              </div>
            ) : (
              <div style={{ padding:"12px 20px", borderTop:"1px solid rgba(255,255,255,0.06)", textAlign:"center", fontSize:13, color:C.midGray }}>
                Ticket closed · <button onClick={()=>updateStatus("Open")} style={{ background:"transparent", border:"none", color:C.crimson, cursor:"pointer", fontSize:13 }}>Reopen</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}