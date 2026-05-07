import { C } from "../styles/colors";

export default function AdminHeader({ activeTab, user, onOpenDrawer }) {
  return (
    <div className="vai-admin-content-pad" style={{ paddingBottom: 0 }}>
      <header className="vai-admin-header-row">
        {/* Left: hamburger (mobile) + title block */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
          <button
            type="button"
            className="vai-admin-hamburger"
            onClick={onOpenDrawer}
            aria-label="Open menu"
          >
            <span aria-hidden="true" style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
              <span style={{ width: 18, height: 2, background: C.offWhite, borderRadius: 1 }} />
              <span style={{ width: 18, height: 2, background: C.offWhite, borderRadius: 1 }} />
              <span style={{ width: 18, height: 2, background: C.offWhite, borderRadius: 1 }} />
            </span>
          </button>

          <div style={{ minWidth: 0 }}>
            <h1
              className="display-heading"
              style={{
                fontSize: 32,
                lineHeight: 1.15,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace("-", " ")}
            </h1>
            <p style={{ color: C.midGray, fontSize: 14, marginTop: 4 }}>
              System Administrator: {user.name}
            </p>
          </div>
        </div>

        {/* Right: System Live badge */}
        <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
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
            />
            <span style={{ fontSize: 12, fontWeight: 600 }}>System Live</span>
          </div>
        </div>
      </header>
    </div>
  );
}