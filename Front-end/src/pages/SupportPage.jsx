import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { C } from "../styles/colors";
import { Icon } from "../components/Icon";
import api from "../api/client";

const CATEGORIES = ["General Inquiry", "Technical", "Billing", "Trip Issue"];

export default function SupportPage({ user, onBack }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const urlTicketId = searchParams.get("ticketId");

  // Derive tab from URL. Defaults: logged-in users → "tickets", guests → "new".
  const defaultTab = user ? "tickets" : "new";
  const tab = urlTab === "tickets" || urlTab === "new" ? urlTab : defaultTab;

  const setTab = (next) => {
    // Changing tabs clears the active ticket deep-link
    const params = {};
    if (next !== defaultTab) params.tab = next;
    setSearchParams(params, { replace: false });
  };

  const [myTickets, setMyTickets]   = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [activeTicket, setActiveTicket]     = useState(null);
  const [msgText, setMsgText]       = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [form, setForm]             = useState({ name: user?.name||"", email: user?.email||"", category: "General Inquiry", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]           = useState("");
  const msgEndRef = useRef();

  // Load the user's tickets once when entering the "tickets" tab.
  // Previously re-ran on every [user, tab] change, which double-fetched.
  useEffect(() => {
    if (!user || tab !== "tickets") return;
    setLoadingTickets(true);
    api
      .get("/support/my")
      .then(({ data }) => setMyTickets(data.data.tickets))
      .catch(console.error)
      .finally(() => setLoadingTickets(false));
    // We intentionally depend on user?._id not the whole user object to avoid
    // re-fetching when other user fields change.
  }, [user?._id, tab]);

  // Open the active ticket from the URL (?ticketId=...).
  // This handles both deep-links on refresh and in-app clicks that update the URL.
  useEffect(() => {
    if (!urlTicketId) {
      setActiveTicket(null);
      return;
    }
    // Prefer the ticket already in the loaded list.
    const found = myTickets.find((t) => t._id === urlTicketId);
    if (found) {
      setActiveTicket(found);
      return;
    }
    // If not yet in the list (e.g. first load on refresh), fetch it directly.
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/support/${urlTicketId}`);
        if (!cancelled) setActiveTicket(data.data.ticket);
      } catch (err) {
        console.error("Failed to load ticket:", err);
        // Bad/expired id — clear it from the URL so the user goes back to the list
        if (!cancelled) {
          const params = {};
          if (tab !== defaultTab) params.tab = tab;
          setSearchParams(params, { replace: true });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [urlTicketId, myTickets]); // eslint-disable-line

  const openTicket = (t) => {
    const params = { ticketId: t._id };
    if (tab !== defaultTab) params.tab = tab;
    setSearchParams(params, { replace: false });
  };

  const closeTicket = () => {
    const params = {};
    if (tab !== defaultTab) params.tab = tab;
    setSearchParams(params, { replace: false });
  };

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTicket?.messages]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) { setError("Please fill all required fields."); return; }
    setSubmitting(true); setError("");
    try {
      await api.post("/support", form);
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); setForm(f => ({ ...f, message: "", category: "General Inquiry" })); if (user) setTab("tickets"); }, 2500);
    } catch (err) { setError(err.response?.data?.message || "Submission failed. Please try again."); }
    finally { setSubmitting(false); }
  };

  const handleSendMessage = async () => {
    if (!msgText.trim() || !activeTicket) return;
    setSendingMsg(true);
    try {
      const { data } = await api.post(`/support/${activeTicket._id}/message`, { text: msgText });
      const updated = data.data.ticket;
      setActiveTicket(updated);
      setMyTickets(p => p.map(t => t._id === updated._id ? updated : t));
      setMsgText("");
    } catch (err) { console.error(err); }
    finally { setSendingMsg(false); }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" });
  const fmtTime = (d) => new Date(d).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ minHeight: "100vh", background: C.nearBlack }}>
      {/* Header */}
      <div style={{ background: "rgba(13,13,13,0.95)", borderBottom: `1px solid rgba(140,50,50,0.2)`, padding: "0 5%", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, background: C.crimson, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon.plane /></div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700 }}>Voyageur<span style={{ color: C.crimson }}>AI</span></span>
        </div>
        <button onClick={onBack} style={{ background: "transparent", border: "none", color: C.midGray, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon.arrowLeft width="16" height="16" /> {user ? "Dashboard" : "Home"}
        </button>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 5%" }}>
        <p className="section-label" style={{ marginBottom: 4 }}>Help Centre</p>
        <h1 className="display-heading" style={{ fontSize: "clamp(28px,4vw,44px)", marginBottom: 8 }}>Support & Contact</h1>
        <p style={{ color: C.midGray, fontSize: 15, marginBottom: 40 }}>We're here to help. Average response time: 2 hours.</p>

        {/* Tabs */}
        {user && (
          <div style={{ display: "flex", gap: 8, marginBottom: 36 }}>
            {[["tickets","My Tickets"], ["new","New Ticket"]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                style={{ padding: "10px 20px", borderRadius: 6, border: tab===id ? `1.5px solid ${C.crimson}` : "1px solid rgba(255,255,255,0.1)", background: tab===id ? "rgba(140,50,50,0.12)" : "transparent", color: tab===id ? C.crimson : C.midGray, cursor: "pointer", fontSize: 14, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>{label}</button>
            ))}
          </div>
        )}

        {/* MY TICKETS */}
        {tab === "tickets" && user && (
          <div style={{ display: "grid", gridTemplateColumns: activeTicket ? "340px 1fr" : "1fr", gap: 24 }}>
            {/* Ticket list */}
            <div>
              {loadingTickets ? <div style={{ textAlign: "center", padding: 32, color: C.midGray }}>Loading...</div>
                : myTickets.length === 0 ? (
                  <div className="card" style={{ padding: "48px 32px", textAlign: "center" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 8 }}>No tickets yet</h3>
                    <p style={{ color: C.midGray, fontSize: 14, marginBottom: 20 }}>Submit a new ticket for any help you need.</p>
                    <button className="btn-primary" onClick={() => setTab("new")}>Create Ticket</button>
                  </div>
                ) : (
                  <div className="card" style={{ overflow: "hidden" }}>
                    {myTickets.map((t, i) => (
                      <div key={t._id} onClick={() => openTicket(t)} style={{ padding: "16px 20px", borderBottom: i < myTickets.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", cursor: "pointer", background: activeTicket?._id === t._id ? "rgba(140,50,50,0.08)" : "transparent", transition: "background 0.15s" }}
                        onMouseEnter={(e) => { if (activeTicket?._id !== t._id) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                        onMouseLeave={(e) => { if (activeTicket?._id !== t._id) e.currentTarget.style.background = "transparent"; }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{t.category}</span>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: t.status === "Closed" ? "rgba(255,255,255,0.06)" : t.status === "In Progress" ? "rgba(255,180,0,0.12)" : "rgba(140,50,50,0.15)", color: t.status === "Closed" ? C.midGray : t.status === "In Progress" ? "#FFB400" : C.crimson }}>
                            {t.status}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: C.midGray, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.message}</p>
                        <div style={{ fontSize: 11, color: C.midGray, marginTop: 4 }}>{fmtDate(t.createdAt)} · {t.messages?.length || 1} message{(t.messages?.length || 1) !== 1 ? "s" : ""}</div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Thread panel */}
            {activeTicket && (
              <div className="card" style={{ display: "flex", flexDirection: "column", height: 600, overflow: "hidden" }}>
                {/* Thread header */}
                <div style={{ padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                  <div>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17 }}>{activeTicket.category}</h3>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: activeTicket.status === "Closed" ? "rgba(255,255,255,0.06)" : "rgba(140,50,50,0.15)", color: activeTicket.status === "Closed" ? C.midGray : C.crimson }}>{activeTicket.status}</span>
                  </div>
                  <button onClick={closeTicket} style={{ background: "transparent", border: "none", color: C.midGray, cursor: "pointer", fontSize: 18 }}>✕</button>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  {(activeTicket.messages || [{ sender: "user", senderName: activeTicket.name, text: activeTicket.message, createdAt: activeTicket.createdAt }]).map((msg, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: msg.sender === "user" ? "row-reverse" : "row", gap: 10, alignItems: "flex-end" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: msg.sender === "admin" ? C.crimson : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                        {msg.sender === "admin" ? "S" : (user?.name?.[0] || "U")}
                      </div>
                      <div style={{ maxWidth: "70%" }}>
                        <div style={{ fontSize: 11, color: C.midGray, marginBottom: 4, textAlign: msg.sender === "user" ? "right" : "left" }}>
                          {msg.senderName} · {fmtTime(msg.createdAt)}
                        </div>
                        <div style={{ padding: "10px 14px", borderRadius: msg.sender === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px", background: msg.sender === "user" ? C.crimson : "rgba(255,255,255,0.06)", fontSize: 13, lineHeight: 1.6 }}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  ))}
                  {activeTicket.adminReply && !(activeTicket.messages?.some(m => m.sender === "admin")) && (
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.crimson, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>S</div>
                      <div style={{ maxWidth: "70%" }}>
                        <div style={{ fontSize: 11, color: C.midGray, marginBottom: 4 }}>Support Team</div>
                        <div style={{ padding: "10px 14px", borderRadius: "4px 12px 12px 12px", background: "rgba(255,255,255,0.06)", fontSize: 13, lineHeight: 1.6 }}>{activeTicket.adminReply}</div>
                      </div>
                    </div>
                  )}
                  <div ref={msgEndRef} />
                </div>

                {/* Message input */}
                {activeTicket.status !== "Closed" && (
                  <div style={{ padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 10, flexShrink: 0 }}>
                    <input value={msgText} onChange={(e) => setMsgText(e.target.value)} placeholder="Type your message..." style={{ flex: 1 }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
                    <button className="btn-primary" style={{ padding: "10px 18px", fontSize: 13 }} onClick={handleSendMessage} disabled={sendingMsg || !msgText.trim()}>
                      {sendingMsg ? "..." : "Send"}
                    </button>
                  </div>
                )}
                {activeTicket.status === "Closed" && (
                  <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center", fontSize: 13, color: C.midGray }}>This ticket is closed. Create a new ticket for further assistance.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* NEW TICKET FORM */}
        {(tab === "new" || !user) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 32, alignItems: "start" }}>
            <div className="card" style={{ padding: "32px" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 24 }}>Send a Message</h2>
              {submitted && <div style={{ background: "rgba(50,180,50,0.12)", border: "1px solid #5CCC5C", borderRadius: 8, padding: "14px 18px", marginBottom: 24, fontSize: 14 }}>✓ Ticket submitted! We'll get back to you shortly.</div>}
              {error && <div style={{ background: "rgba(200,50,50,0.12)", border: "1px solid rgba(200,50,50,0.4)", borderRadius: 8, padding: "14px 18px", marginBottom: 24, fontSize: 13, color: "#FF6B6B" }}>{error}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div><label style={{ fontSize: 12, color: C.midGray, marginBottom: 6, display: "block" }}>Full Name *</label><input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ahmed Khan" readOnly={!!user?.name} /></div>
                  <div><label style={{ fontSize: 12, color: C.midGray, marginBottom: 6, display: "block" }}>Email *</label><input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" readOnly={!!user?.email} /></div>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.midGray, marginBottom: 6, display: "block" }}>Category</label>
                  <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: C.offWhite, fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>
                    {CATEGORIES.map(c => <option key={c} value={c} style={{ background: "#1a1a1a" }}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: C.midGray, marginBottom: 6, display: "block" }}>Message *</label>
                  <textarea value={form.message} onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Describe your issue in detail..." rows={5} style={{ resize: "vertical", minHeight: 120 }} />
                </div>
                <button className="btn-primary" style={{ alignSelf: "flex-start" }} onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[{ icon: "⏱️", title: "Response Time", desc: "We typically respond within 2 hours during business hours." }, { icon: "🔒", title: "Secure & Private", desc: "All support conversations are encrypted and confidential." }, { icon: "🤖", title: "AI Trip Issues", desc: "Having trouble with itinerary generation? We'll help you right away." }].map(({ icon, title, desc }) => (
                <div key={title} className="card" style={{ padding: "20px 24px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 24 }}>{icon}</span>
                  <div><h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, marginBottom: 4 }}>{title}</h4><p style={{ fontSize: 13, color: C.midGray, lineHeight: 1.6 }}>{desc}</p></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
