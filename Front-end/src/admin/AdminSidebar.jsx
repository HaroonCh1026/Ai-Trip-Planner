import { C } from "../styles/colors";
import { Icon } from "../components/Icon";

const NAV_ITEMS = [
  { id: "dashboard", icon: <Icon.sparkle />, label: "Dashboard" },
  { id: "users",     icon: <Icon.user />,    label: "Users" },
  { id: "trips",     icon: <Icon.map />,     label: "Trip Analytics" },
  { id: "bookings",  icon: <Icon.dollar />,  label: "Bookings" },
  { id: "support",   icon: <Icon.shield />,  label: "Support Tickets" },
  { id: "blogs",     icon: <Icon.sparkle />, label: "Blog Management" },
  { id: "logs",      icon: <Icon.shield />,  label: "Activity Log" },
];

export default function AdminSidebar({ activeTab, setActiveTab, onLogout, openTicketCount }) {
  return (
    <aside style={{ background: "#0A0A0A", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", padding: "24px 0" }}>
      {/* Logo */}
      <div style={{ padding: "0 24px 32px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, background: C.crimson, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon.plane /></div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700 }}>Voyageur<span style={{ color: C.crimson }}>AI</span></div>
            <div style={{ fontSize: 10, color: C.midGray, textTransform: "uppercase", letterSpacing: "0.1em" }}>Admin Panel</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "20px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: activeTab === item.id ? "rgba(140,50,50,0.15)" : "transparent", color: activeTab === item.id ? C.offWhite : C.midGray, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: activeTab === item.id ? 500 : 400, transition: "all 0.15s", textAlign: "left", position: "relative" }}
            onMouseEnter={(e) => { if (activeTab !== item.id) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
            onMouseLeave={(e) => { if (activeTab !== item.id) e.currentTarget.style.background = "transparent"; }}>
            <span style={{ color: activeTab === item.id ? C.crimson : "inherit" }}>{item.icon}</span>
            {item.label}
            {item.id === "support" && openTicketCount > 0 && (
              <span style={{ marginLeft: "auto", background: C.crimson, color: "#fff", borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "2px 7px", minWidth: 20, textAlign: "center" }}>{openTicketCount}</span>
            )}
            {activeTab === item.id && <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 3, background: C.crimson, borderRadius: "0 2px 2px 0" }} />}
          </button>
        ))}
      </nav>

      {/* Footer — logout only, NO return to site */}
      <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: C.midGray, fontSize: 14, fontFamily: "'DM Sans', sans-serif", width: "100%", transition: "all 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,50,50,0.1)"; e.currentTarget.style.color = "#FF8080"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.midGray; }}>
          <Icon.logout /> Logout
        </button>
      </div>
    </aside>
  );
}
