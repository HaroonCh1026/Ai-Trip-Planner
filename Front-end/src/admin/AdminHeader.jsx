import { C } from "../styles/colors";

export default function AdminHeader({ activeTab, user }) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 40,
      }}
    >
      <div>
        <h1 className="display-heading" style={{ fontSize: 32 }}>
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </h1>
        <p style={{ color: C.midGray, fontSize: 14, marginTop: 4 }}>
          System Administrator: {user.name}
        </p>
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <div
          style={{
            background: C.darkGray,
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#5CCC5C",
              boxShadow: "0 0 10px #5CCC5C",
            }}
          ></div>
          <span style={{ fontSize: 12, fontWeight: 600 }}>System Live</span>
        </div>
      </div>
    </header>
  );
}