import { useState } from "react";
import { C } from "../../styles/colors";
import { Icon } from "../../components/Icon";
import api from "../../api/client";

export default function AdminUsers({ users, setUsers }) {
  const [search, setSearch] = useState("");

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
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update user status.");
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete user.");
    }
  };

  return (
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

      <div className="card" style={{ overflow: "hidden" }}>
        <style>{`.hover-row:hover { background: rgba(140,50,50,0.03); }`}</style>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
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
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      background:
                        u.status === "Active"
                          ? "rgba(80,200,80,0.1)"
                          : "rgba(224,92,92,0.1)",
                      color: u.status === "Active" ? "#5CCC5C" : C.crimson,
                    }}
                  >
                    {u.status}
                  </span>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => toggleStatus(u.id, u.status)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 6,
                        border: `1px solid ${u.status === "Active" ? C.crimson : "#5CCC5C"}`,
                        background: "transparent",
                        color: u.status === "Active" ? C.crimson : "#5CCC5C",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {u.status === "Active" ? "Block" : "Unblock"}
                    </button>
                    <button
                      onClick={() => deleteUser(u.id)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "transparent",
                        color: C.midGray,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}