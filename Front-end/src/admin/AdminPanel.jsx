import { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { C } from "../styles/colors";
import api from "../api/client";

import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import AdminDashboard from "./dashboard/AdminDashboard";
import AdminUsers from "./users/AdminUsers";
import AdminTrips from "./trips/AdminTrips";
import AdminBookings from "./bookings/AdminBookings";
import AdminSupport from "./support/AdminSupport";
import AdminBlogs from "./blogs/AdminBlogs";
import AdminLogs from "./logs/AdminLogs";

const VALID_TABS = [
  "dashboard",
  "users",
  "trips",
  "bookings",
  "support",
  "blogs",
  "logs",
];

export default function AdminPanel({
  user,
  onLogout,
  onViewTrip,
  aiConfig, // eslint-disable-line no-unused-vars
  setAiConfig, // eslint-disable-line no-unused-vars
}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive the active tab from the URL (/admin or /admin/<tab>).
  // Falls back to "dashboard" if the URL has no segment or an unknown one.
  const urlTab = location.pathname
    .replace(/^\/admin\/?/, "")
    .split("/")[0];
  const activeTab = VALID_TABS.includes(urlTab) ? urlTab : "dashboard";

  // Setter used by the sidebar — just navigates, URL is the source of truth.
  const setActiveTab = (tab) => {
    if (tab === "dashboard") navigate("/admin");
    else navigate(`/admin/${tab}`);
  };

  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [bookingMeta, setBookingMeta] = useState({
    totalRevenue: 0,
    paidCount: 0,
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTrips: 0,
    aiCalls: 0,
    revenue: "PKR 0",
    userGrowth: 0,
    tripGrowth: 0,
    regions: [],
    monthlyData: [],
    proUsers: 0,
  });

  const load = async () => {
    try {
      const [s, u, t, b, tk, bl] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
        api.get("/admin/trips"),
        api.get("/admin/bookings"),
        api.get("/admin/support"),
        api.get("/admin/blogs"),
      ]);
      setStats(s.data.data);
      setUsers(u.data.data.users);
      setTrips(t.data.data.trips);
      const bData = b.data.data;
      setBookings(bData.bookings);
      setBookingMeta({
        totalRevenue: bData.totalRevenue || 0,
        paidCount: bData.paidCount || 0,
      });
      setTickets(tk.data.data.tickets);
      setBlogs(bl.data.data.blogs);
    } catch (err) {
      console.error("Admin data load failed:", err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openTicketCount = tickets.filter((t) => t.status === "Open").length;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        background: C.nearBlack,
      }}
    >
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        openTicketCount={openTicketCount}
      />
      <div style={{ display: "flex", flexDirection: "column", overflow: "auto" }}>
        <AdminHeader user={user} activeTab={activeTab} />
        <div style={{ flex: 1, padding: "32px 40px" }}>
          <Routes>
            <Route
              index
              element={
                <AdminDashboard
                  stats={stats}
                  users={users}
                  trips={trips}
                  bookings={bookings}
                />
              }
            />
            <Route
              path="dashboard"
              element={<Navigate to="/admin" replace />}
            />
            <Route
              path="users"
              element={<AdminUsers users={users} setUsers={setUsers} />}
            />
            <Route
              path="trips"
              element={<AdminTrips trips={trips} onViewTrip={onViewTrip} />}
            />
            <Route
              path="bookings"
              element={
                <AdminBookings bookings={bookings} bookingMeta={bookingMeta} />
              }
            />
            <Route
              path="support"
              element={
                <AdminSupport
                  tickets={tickets}
                  setTickets={setTickets}
                  onReload={load}
                />
              }
            />
            <Route
              path="blogs"
              element={<AdminBlogs blogs={blogs} setBlogs={setBlogs} />}
            />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
