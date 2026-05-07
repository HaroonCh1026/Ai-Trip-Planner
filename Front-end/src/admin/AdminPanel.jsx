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
import AdminBookings from "./bookings/AdminBookings";
import AdminSupport from "./support/AdminSupport";
import AdminBlogs from "./blogs/AdminBlogs";
import AdminLogs from "./logs/AdminLogs";
import AdminPricing from "./pricing/AdminPricing";
import AdminRevenue from "./revenue/AdminRevenue";
import AdminMLAnalytics from "./ml-analytics/AdminMLAnalytics";

const VALID_TABS = [
  "dashboard",
  "users",
  "bookings",
  "support",
  "blogs",
  "logs",
  "pricing",
  "revenue",
  "ml-analytics",
];

export default function AdminPanel({
  user,
  onLogout,
  aiConfig, // eslint-disable-line no-unused-vars
  setAiConfig, // eslint-disable-line no-unused-vars
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const urlTab = location.pathname
    .replace(/^\/admin\/?/, "")
    .split("/")[0];
  const activeTab = VALID_TABS.includes(urlTab) ? urlTab : "dashboard";

  // Round 4 mobile: drawer state for the slide-in sidebar on phones.
  // No-op on desktop because the drawer styles only apply at <=480px.
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Setter used by the sidebar — navigates AND closes the drawer if open.
  const setActiveTab = (tab) => {
    setDrawerOpen(false);
    if (tab === "dashboard") navigate("/admin");
    else navigate(`/admin/${tab}`);
  };

  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [blogs, setBlogs] = useState([]); // eslint-disable-line no-unused-vars
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
      const [s, u, b, tk, bl] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
        api.get("/admin/bookings"),
        api.get("/admin/support"),
        api.get("/admin/blogs"),
      ]);
      setStats(s.data.data);
      setUsers(u.data.data.users);
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

  // Lock body scroll when the mobile drawer is open so the page
  // behind doesn't scroll under your finger.
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  const openTicketCount = tickets.filter((t) => t.status === "Open").length;

  return (
    <div className="vai-admin-shell" style={{ background: C.nearBlack }}>
      {/* Backdrop — only visible on mobile when drawer is open */}
      {drawerOpen && (
        <div
          className="vai-admin-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        openTicketCount={openTicketCount}
        drawerOpen={drawerOpen}
        onCloseDrawer={() => setDrawerOpen(false)}
      />

      <div style={{ display: "flex", flexDirection: "column", overflow: "auto", minWidth: 0 }}>
        <AdminHeader
          user={user}
          activeTab={activeTab}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
        <div className="vai-admin-content-pad" style={{ flex: 1 }}>
          <Routes>
            <Route
              index
              element={
                <AdminDashboard
                  stats={stats}
                  users={users}
                  bookings={bookings}
                />
              }
            />
            <Route path="dashboard" element={<Navigate to="/admin" replace />} />
            <Route
              path="users"
              element={<AdminUsers users={users} setUsers={setUsers} />}
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
            <Route path="pricing" element={<AdminPricing />} />
            <Route path="revenue" element={<AdminRevenue />} />
            <Route path="ml-analytics" element={<AdminMLAnalytics />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}