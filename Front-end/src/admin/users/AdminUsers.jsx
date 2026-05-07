import { useState } from "react";
import { C } from "../../styles/colors";
import { Icon } from "../../components/Icon";
import api from "../../api/client";
import Toast from "../../components/ui/Toast";
import ConfirmModal from "../../components/ui/ConfirmModal";

export default function AdminUsers({ users, setUsers }) {
  const [search, setSearch] = useState("");
  const [toast, setToast]     = useState(null);
  const [confirm, setConfirm] = useState(null);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "Active" ? "Blocked" : "Active";
    try {
      await api.patch(`/admin/users/${id}/status`, { status: newStatus });
      setUsers(users.map((u) => (u.id === id ? { ...u, status: newStatus } : u)));
      setToast({ kind: "success", message: `User ${newStatus === "Active" ? "unblocked" : "blocked"}.` });
    } catch (err) {
      setToast({ kind: "error", message: err.response?.data?.message || "Failed to update user status." });
    }
  };

  const deleteUser = (id) => {
    setConfirm({
      title: "Delete this user?",
      message: "All trips and data linked to this user will also be removed. This cannot be undone.",
      confirmLabel: "Delete user",
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/admin/users/${id}`);
          setUsers(users.filter((u) => u.id !== id));
          setToast({ kind: "success", message: "User deleted." });
        } catch (err) {
          setToast({ kind: "error", message: err.response?.data?.message || "Failed to delete user." });
        }
      },
    });
  };

  // Reusable action button styles for both desktop table and mobile cards
  const blockBtnStyle = (status) => ({
    padding: "6px 14px",
    borderRadius: 6,
    border: `1px solid ${status === "Active" ? C.crimson : "#5CCC5C"}`,
    background: "transparent",
    color: status === "Active" ? C.crimson : "#5CCC5C",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  });
  const deleteBtnStyle = {
    padding: "6px 14px",
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "transparent",
    color: C.midGray,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  };
  const statusPillStyle = (status) => ({
    padding: "4px 12px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    background: status === "Active" ? "rgba(80,200,80,0.1)" : "rgba(224,92,92,0.1)",
    color: status === "Active" ? "#5CCC5C" : C.crimson,
    whiteSpace: "nowrap",
  });

  return (
    <>
    <div className="anim-fadeIn">
      <div style={{ marginBottom: 24, position: "relative" }}>
        <input
          placeholder="Search users by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 44 }}
        />
        <div
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            color: C.midGray,
          }}
        >
          <Icon.user width="18" height="18" />
        </div>
      </div>

      <div className="card vai-admin-table-wrap" style={{ overflow: "hidden" }}>
        <style>{`.hover-row:hover { background: rgba(140,50,50,0.03); }`}</style>

        {/* Desktop: table (hidden on phone via vai-admin-table-wrap rule) */}
        <table className="vai-admin-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr
              style={{
                background: "rgba(255,255,255,0.02)",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {["USER", "ROLE", "JOINED", "TRIPS", "STATUS", "ACTIONS"].map((h) => (
                <th
                  key={h}
                  style={{ padding: "16px 24px", fontSize: 12, color: C.midGray, fontWeight: 600 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr
                key={u.id}
                className="hover-row"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
              >
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: C.midGray }}>{u.email}</div>
                </td>
                <td style={{ padding: "16px 24px", fontSize: 13, color: C.midGray }}>{u.role}</td>
                <td style={{ padding: "16px 24px", fontSize: 13, color: C.midGray }}>{u.joined}</td>
                <td style={{ padding: "16px 24px", fontSize: 13, color: C.midGray }}>{u.trips}</td>
                <td style={{ padding: "16px 24px" }}>
                  <span style={statusPillStyle(u.status)}>{u.status}</span>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => toggleStatus(u.id, u.status)} style={blockBtnStyle(u.status)}>
                      {u.status === "Active" ? "Block" : "Unblock"}
                    </button>
                    <button onClick={() => deleteUser(u.id)} style={deleteBtnStyle}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile: card list (hidden on desktop, only shown via vai-admin-cards rule) */}
        <div className="vai-admin-cards">
          {filtered.length === 0 && (
            <div style={{ padding: 16, color: C.midGray, fontSize: 13, textAlign: "center" }}>
              No users match your search.
            </div>
          )}
          {filtered.map((u) => (
            <div key={u.id} className="vai-admin-row-card">
              <div className="vai-row-head">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.offWhite,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {u.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: C.midGray,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: 2,
                    }}
                  >
                    {u.email}
                  </div>
                </div>
                <span style={statusPillStyle(u.status)}>{u.status}</span>
              </div>

              <dl className="vai-row-meta">
                <dt>Role</dt><dd>{u.role}</dd>
                <dt>Joined</dt><dd>{u.joined}</dd>
                <dt>Trips</dt><dd>{u.trips}</dd>
              </dl>

              <div className="vai-row-actions">
                <button onClick={() => toggleStatus(u.id, u.status)} style={blockBtnStyle(u.status)}>
                  {u.status === "Active" ? "Block" : "Unblock"}
                </button>
                <button onClick={() => deleteUser(u.id)} style={deleteBtnStyle}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    <Toast toast={toast} onClose={() => setToast(null)} />
    <ConfirmModal confirm={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}