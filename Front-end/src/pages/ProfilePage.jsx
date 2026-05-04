import { useState, useRef, useEffect } from "react";
import { C } from "../styles/colors";
import { Icon } from "../components/Icon";
import api, { createCheckoutSession, cancelSubscription } from "../api/client";
import ConfirmModal from "../components/ui/ConfirmModal";

// /uploads/... is served by the backend, not Vite. Resolve relative URLs
// against the API origin. data: URLs and absolute URLs (Google profile pics,
// blob: previews) pass through unchanged.
const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api")
  .replace(/\/api\/?$/, "");
const resolveAvatarUrl = (url) => {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("/")) return API_ORIGIN + url;
  return url;
};

export default function ProfilePage({
  user,
  trips,
  freeLeft,
  onLogout,
  onUserUpdate,
}) {
  const [section, setSection] = useState("personal");
  const [editMode, setEditMode] = useState(false);
  const [info, setInfo] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    city: user.city || "",
    bio: user.bio || "",
  });
  const [avatar, setAvatar] = useState(user.avatar || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [pw, setPw] = useState({ current: "", newPw: "", confirm: "" });
  const [pwErr, setPwErr] = useState("");
  const [pwOk, setPwOk] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  // Round 4 (#7b): cancel-subscription state. confirm-modal pattern follows
  // the rest of the codebase (Dashboard uses ConfirmModal too).
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");
  const [cancelError, setCancelError] = useState("");

  // Round 3 (issue #9): sync local avatar state with the user prop.
  //
  // Why this is needed:
  //   On a hard refresh, App.jsx loads user from localStorage and immediately
  //   fires GET /auth/me to refresh it. If /auth/me resolves AFTER ProfilePage
  //   has already mounted, the parent's `user` prop changes but this
  //   component's local `avatar` state — initialised once via useState — would
  //   stay stale. The render uses `avatar` (local state), so the avatar
  //   appears to "disappear" on refresh until the user clicks Edit Profile
  //   (which forces a re-mount).
  //
  // The effect listens to user.avatar and writes it back into local state,
  // but only when we're NOT mid-upload (otherwise it would clobber the
  // optimistic blob: preview the upload handler set).
  useEffect(() => {
    if (saving) return;
    setAvatar(user.avatar || "");
  }, [user.avatar, saving]);

  const [prefs, setPrefs] = useState({
    nature: true,
    culture: true,
    food: false,
    adventure: false,
    luxury: true,
    budget: false,
  });
  const [notifs, setNotifs] = useState({
    tripReminders: true,
    newFeatures: true,
    promotions: false,
    weeklyDigest: true,
  });
  const fileRef = useRef();

  const isPro = user.plan === "pro";
  const initials = (info.name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Upload immediately to the dedicated /auth/avatar endpoint.
  // Updates the avatar URL in state + persists user to localStorage on success.
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSaveErr("Image must be under 2MB.");
      return;
    }
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      setSaveErr("Only JPEG, PNG, WebP, or GIF images are allowed.");
      return;
    }
    setSaveErr("");
    setSaving(true);
    let localPreview = "";
    try {
      // Show a local preview instantly so the UI feels responsive.
      localPreview = URL.createObjectURL(file);
      setAvatar(localPreview);

      const fd = new FormData();
      fd.append("image", file);
      const { data } = await api.post("/auth/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const u = data.data.user;
      // Server URL becomes the canonical avatar (the local blob URL was just for preview).
      setAvatar(u.avatar || "");
      localStorage.setItem("user", JSON.stringify({ ...user, ...u }));
      if (onUserUpdate) onUserUpdate(u);
    } catch (err) {
      setSaveErr(err.response?.data?.message || "Image upload failed.");
      // Roll back preview on failure
      setAvatar(user.avatar || "");
    } finally {
      if (localPreview) URL.revokeObjectURL(localPreview);
      setSaving(false);
      // Reset the file input so picking the same file again triggers onChange
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!info.name.trim()) {
      setSaveErr("Name cannot be empty.");
      return;
    }
    setSaving(true);
    setSaveErr("");
    try {
      const { data } = await api.patch("/auth/profile", {
        name: info.name,
        phone: info.phone,
        city: info.city,
        bio: info.bio,
      });
      const u = data.data.user;
      localStorage.setItem("user", JSON.stringify({ ...user, ...u }));
      if (onUserUpdate) onUserUpdate(u);
      setSaved(true);
      setEditMode(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveErr(err.response?.data?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  // Round 4 (#7b): cancel subscription handler.
  // Calls /payments/cancel-subscription. The backend downgrades the user
  // to "free" plan and clears planExpires, but returns null data. We
  // optimistically update the local user state so the UI re-renders
  // immediately as "Free Tier" without needing a manual refresh.
  // ConfirmModal closes itself via onClose after running this — no need
  // to setShowCancelConfirm(false) at the top.
  const handleCancelSubscription = async () => {
    setCancelling(true);
    setCancelError("");
    setCancelMessage("");
    try {
      const response = await cancelSubscription();
      if (response.success) {
        const msg = response.message || "Subscription cancelled successfully.";
        setCancelMessage(msg);
        // Backend doesn't return a user object — apply the downgrade locally.
        // The user is now on free plan; clear planExpires.
        const updatedUser = { ...user, plan: "free", planExpires: null };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        if (onUserUpdate) onUserUpdate(updatedUser);
        setTimeout(() => setCancelMessage(""), 6000);
      } else {
        setCancelError(response.message || "Could not cancel subscription.");
      }
    } catch (err) {
      console.error("Cancel subscription error:", err);
      setCancelError(
        err.response?.data?.message ||
          "Something went wrong cancelling your subscription. Please try again or contact support."
      );
    } finally {
      setCancelling(false);
    }
  };

  const handlePwChange = async () => {
    setPwErr("");
    setPwOk(false);
    if (!pw.current || !pw.newPw || !pw.confirm) {
      setPwErr("All fields required.");
      return;
    }
    if (pw.newPw.length < 8) {
      setPwErr("Password must be at least 8 characters.");
      return;
    }
    if (pw.newPw !== pw.confirm) {
      setPwErr("Passwords do not match.");
      return;
    }
    setPwSaving(true);
    try {
      await api.patch("/auth/profile", {
        currentPassword: pw.current,
        newPassword: pw.newPw,
      });
      setPwOk(true);
      setPw({ current: "", newPw: "", confirm: "" });
      setTimeout(() => setPwOk(false), 3000);
    } catch (err) {
      setPwErr(err.response?.data?.message || "Password update failed.");
    } finally {
      setPwSaving(false);
    }
  };

  const Tab = ({ id, label }) => (
    <button
      onClick={() => setSection(id)}
      style={{
        padding: "10px 16px",
        borderRadius: 6,
        border: "none",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 500,
        fontFamily: "'DM Sans', sans-serif",
        textAlign: "left",
        background: section === id ? "rgba(140,50,50,0.15)" : "transparent",
        color: section === id ? C.crimson : C.midGray,
        borderLeft: `3px solid ${section === id ? C.crimson : "transparent"}`,
      }}
    >
      {label}
    </button>
  );

  if (!user) return null;

  return (
    <div style={{ maxWidth: 900 }}>
      {showUpgrade && (
        <UpgradeModal
          user={user}
          onClose={() => setShowUpgrade(false)}
          onUserUpdate={onUserUpdate}
        />
      )}

      {/* Round 4 (#7b): cancel-subscription confirm modal */}
      {showCancelConfirm && (
        <ConfirmModal
          confirm={{
            title: "Cancel Pro subscription?",
            message:
              "You'll lose access to unlimited itineraries, PDF export, Insider Tips, and other Pro features. You can re-upgrade anytime.",
            confirmLabel: "Yes, cancel subscription",
            cancelLabel: "Keep Pro plan",
            destructive: true,
            onConfirm: handleCancelSubscription,
          }}
          onClose={() => setShowCancelConfirm(false)}
        />
      )}

      <div style={{ marginBottom: 32 }}>
        <p className="section-label">Account Management</p>
        <h1
          className="display-heading"
          style={{ fontSize: "clamp(26px, 4vw, 40px)" }}
        >
          Your Profile
        </h1>
      </div>

      {saved && (
        <div
          style={{
            background: "rgba(50,180,50,0.12)",
            border: "1px solid #5CCC5C",
            borderRadius: 8,
            padding: "12px 20px",
            marginBottom: 24,
            fontSize: 14,
          }}
        >
          ✓ Changes saved.
        </div>
      )}
      {saveErr && (
        <div
          style={{
            background: "rgba(200,50,50,0.12)",
            border: "1px solid rgba(200,50,50,0.4)",
            borderRadius: 8,
            padding: "12px 20px",
            marginBottom: 24,
            fontSize: 14,
            color: "#FF6B6B",
          }}
        >
          {saveErr}
        </div>
      )}

      <div
        style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 32 }}
      >
        {/* Sidebar */}
        <div>
          <div
            className="card"
            style={{ padding: 24, textAlign: "center", marginBottom: 16 }}
          >
            {/* Avatar with upload */}
            <div
              style={{
                position: "relative",
                width: 80,
                height: 80,
                margin: "0 auto 12px",
                cursor: "pointer",
              }}
              onClick={() => fileRef.current?.click()}
            >
              {avatar ? (
                <img
                  src={resolveAvatarUrl(avatar)}
                  alt="avatar"
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: `2px solid ${C.crimson}`,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 80,
                    height: 80,
                    background: `linear-gradient(135deg, ${C.crimson}, ${C.crimsonDark})`,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    fontWeight: 700,
                    boxShadow: "0 8px 24px rgba(140,50,50,0.3)",
                  }}
                >
                  {initials}
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 24,
                  height: 24,
                  background: C.crimson,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  border: "2px solid #0D0D0D",
                }}
              >
                📷
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleAvatarChange}
              />
            </div>
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {info.name}
            </div>
            <div style={{ color: C.midGray, fontSize: 12, marginTop: 4 }}>
              {info.city || "Pakistan"}
            </div>
            <div
              style={{
                marginTop: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 10px",
                background: isPro
                  ? "rgba(50,180,50,0.15)"
                  : "rgba(140,50,50,0.2)",
                borderRadius: 20,
                fontSize: 11,
                color: isPro ? "#5CCC5C" : C.crimson,
              }}
            >
              {isPro ? "⭐ Pro Plan" : "Free Plan"}
            </div>
          </div>
          <div
            className="card"
            style={{
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Tab id="personal" label="Personal Info" />
            <Tab id="preferences" label="Travel Preferences" />
            <Tab id="security" label="Security" />
            <Tab id="notifications" label="Notifications" />
            <Tab id="plan" label="Plan & Billing" />
            <Tab id="danger" label="Account" />
          </div>
        </div>

        {/* Content */}
        <div>
          {/* PERSONAL INFO */}
          {section === "personal" && (
            <div className="card" style={{ padding: 32 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 28,
                }}
              >
                <div>
                  <h2
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 22,
                    }}
                  >
                    Personal Information
                  </h2>
                  <p style={{ color: C.midGray, fontSize: 13, marginTop: 4 }}>
                    Click the camera icon above to change your profile photo
                  </p>
                </div>
                <button
                  onClick={() => (editMode ? handleSave() : setEditMode(true))}
                  className={editMode ? "btn-primary" : "btn-secondary"}
                  style={{ padding: "9px 20px", fontSize: 13 }}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editMode
                      ? "Save Changes"
                      : "Edit Profile"}
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                }}
              >
                {[
                  { label: "Full Name", key: "name" },
                  { label: "Email Address", key: "email", ro: true },
                  { label: "Phone Number", key: "phone" },
                  { label: "City", key: "city" },
                ].map(({ label, key, ro }) => (
                  <div key={key}>
                    <label
                      style={{
                        fontSize: 12,
                        color: C.midGray,
                        marginBottom: 6,
                        display: "block",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {label}
                    </label>
                    {editMode && !ro ? (
                      <input
                        value={info[key]}
                        onChange={(e) =>
                          setInfo((p) => ({ ...p, [key]: e.target.value }))
                        }
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: 14,
                          padding: "12px 16px",
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: 6,
                          border: "1px solid rgba(255,255,255,0.06)",
                          color: info[key] ? C.offWhite : C.midGray,
                        }}
                      >
                        {info[key] || (
                          <span style={{ fontStyle: "italic" }}>Not set</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: C.midGray,
                    marginBottom: 6,
                    display: "block",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Bio
                </label>
                {editMode ? (
                  <textarea
                    value={info.bio}
                    onChange={(e) =>
                      setInfo((p) => ({ ...p, bio: e.target.value }))
                    }
                    style={{ minHeight: 80, resize: "vertical" }}
                  />
                ) : (
                  <div
                    style={{
                      fontSize: 14,
                      padding: "12px 16px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: info.bio ? C.offWhite : C.midGray,
                      fontStyle: info.bio ? "normal" : "italic",
                      minHeight: 60,
                    }}
                  >
                    {info.bio || "No bio added yet."}
                  </div>
                )}
              </div>
              {editMode && (
                <button
                  onClick={() => {
                    setEditMode(false);
                    setSaveErr("");
                  }}
                  style={{
                    marginTop: 12,
                    background: "transparent",
                    border: "none",
                    color: C.midGray,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Cancel
                </button>
              )}
              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.06)",
                  margin: "28px 0",
                }}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 16,
                }}
              >
                {[
                  { label: "Member Since", value: user.joinDate || "2025" },
                  { label: "Total Itineraries", value: trips.length },
                  { label: "Sign-in Method", value: user.provider || "Email" },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      padding: 16,
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: C.midGray,
                        marginBottom: 4,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {label}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PREFERENCES */}
          {section === "preferences" && (
            <div className="card" style={{ padding: 32 }}>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 22,
                  marginBottom: 8,
                }}
              >
                Travel Preferences
              </h2>
              <p style={{ color: C.midGray, fontSize: 13, marginBottom: 28 }}>
                Helps our AI generate more personalised itineraries
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 28,
                }}
              >
                {Object.entries(prefs).map(([k, active]) => (
                  <button
                    key={k}
                    onClick={() => setPrefs((p) => ({ ...p, [k]: !p[k] }))}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 20,
                      border: `1.5px solid ${active ? C.crimson : "rgba(255,255,255,0.12)"}`,
                      background: active
                        ? "rgba(140,50,50,0.2)"
                        : "transparent",
                      color: active ? C.crimson : C.midGray,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      textTransform: "capitalize",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <button
                className="btn-primary"
                onClick={() => {
                  setSaved(true);
                  setTimeout(() => setSaved(false), 3000);
                }}
              >
                Save Preferences
              </button>
            </div>
          )}

          {/* SECURITY */}
          {section === "security" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card" style={{ padding: "28px 32px" }}>
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 20,
                    marginBottom: 6,
                  }}
                >
                  Change Password
                </h2>
                <p style={{ color: C.midGray, fontSize: 13, marginBottom: 24 }}>
                  {user.provider !== "email"
                    ? "Password change is only available for email accounts."
                    : "Use a strong password with at least 8 characters"}
                </p>
                {user.provider === "email" && (
                  <>
                    {pwErr && (
                      <div
                        style={{
                          background: "rgba(200,50,50,0.12)",
                          border: "1px solid rgba(200,50,50,0.4)",
                          borderRadius: 6,
                          padding: "10px 16px",
                          marginBottom: 16,
                          fontSize: 13,
                          color: "#FF6B6B",
                        }}
                      >
                        {pwErr}
                      </div>
                    )}
                    {pwOk && (
                      <div
                        style={{
                          background: "rgba(50,180,50,0.12)",
                          border: "1px solid #5CCC5C",
                          borderRadius: 6,
                          padding: "10px 16px",
                          marginBottom: 16,
                          fontSize: 13,
                        }}
                      >
                        Password updated!
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                      }}
                    >
                      <div>
                        <label
                          style={{
                            fontSize: 12,
                            color: C.midGray,
                            marginBottom: 6,
                            display: "block",
                          }}
                        >
                          Current Password
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={pw.current}
                          onChange={(e) =>
                            setPw((p) => ({ ...p, current: e.target.value }))
                          }
                        />
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 12,
                        }}
                      >
                        <div>
                          <label
                            style={{
                              fontSize: 12,
                              color: C.midGray,
                              marginBottom: 6,
                              display: "block",
                            }}
                          >
                            New Password
                          </label>
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={pw.newPw}
                            onChange={(e) =>
                              setPw((p) => ({ ...p, newPw: e.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              fontSize: 12,
                              color: C.midGray,
                              marginBottom: 6,
                              display: "block",
                            }}
                          >
                            Confirm
                          </label>
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={pw.confirm}
                            onChange={(e) =>
                              setPw((p) => ({ ...p, confirm: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn-primary"
                      style={{ marginTop: 20, fontSize: 13 }}
                      onClick={handlePwChange}
                      disabled={pwSaving}
                    >
                      {pwSaving ? "Updating..." : "Update Password"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {section === "notifications" && (
            <div className="card" style={{ padding: 32 }}>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 22,
                  marginBottom: 8,
                }}
              >
                Notifications
              </h2>
              <p style={{ color: C.midGray, fontSize: 13, marginBottom: 28 }}>
                Control how VoyageurAI communicates with you
              </p>
              {[
                {
                  key: "tripReminders",
                  label: "Trip Reminders",
                  desc: "Get notified before upcoming trips",
                },
                {
                  key: "newFeatures",
                  label: "New Features",
                  desc: "Hear about new AI capabilities",
                },
                {
                  key: "promotions",
                  label: "Promotions",
                  desc: "Exclusive deals and offers",
                },
                {
                  key: "weeklyDigest",
                  label: "Weekly Digest",
                  desc: "Curated Pakistan highlights every Monday",
                },
              ].map(({ key, label, desc }, i, a) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "18px 0",
                    borderBottom:
                      i < a.length - 1
                        ? "1px solid rgba(255,255,255,0.06)"
                        : "none",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
                    <div
                      style={{ fontSize: 12, color: C.midGray, marginTop: 2 }}
                    >
                      {desc}
                    </div>
                  </div>
                  <div
                    onClick={() => setNotifs((n) => ({ ...n, [key]: !n[key] }))}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      background: notifs[key]
                        ? C.crimson
                        : "rgba(255,255,255,0.15)",
                      cursor: "pointer",
                      position: "relative",
                      transition: "background 0.25s",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "#fff",
                        position: "absolute",
                        top: 3,
                        left: notifs[key] ? 23 : 3,
                        transition: "left 0.25s",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* PLAN & BILLING */}
          {section === "plan" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card" style={{ padding: "28px 32px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: 20,
                        marginBottom: 4,
                      }}
                    >
                      Current Plan
                    </h2>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 12px",
                        background: isPro
                          ? "rgba(50,180,50,0.15)"
                          : "rgba(140,50,50,0.2)",
                        borderRadius: 20,
                        fontSize: 12,
                        color: isPro ? "#5CCC5C" : C.crimson,
                        marginTop: 6,
                      }}
                    >
                      {isPro ? "⭐ Pro Plan — Unlimited" : "Free Tier"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        fontFamily: "'Playfair Display', serif",
                      }}
                    >
                      {isPro ? "PKR 2,500" : "PKR 0"}
                    </div>
                    <div style={{ color: C.midGray, fontSize: 12 }}>
                      per month
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    height: 1,
                    background: "rgba(255,255,255,0.06)",
                    margin: "20px 0",
                  }}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {(isPro
                    ? [
                        { label: "AI Itineraries", value: "Unlimited ∞" },
                        { label: "Trips Created", value: trips.length },
                        { label: "Plan Status", value: "Active" },
                        { label: "Payment Method", value: "Stripe" },
                      ]
                    : [
                        {
                          label: "AI Itineraries Used",
                          value: `${trips.length} of 5`,
                        },
                        {
                          label: "Remaining Quota",
                          value: `${Math.max(0, freeLeft)} itineraries`,
                        },
                        { label: "Plan Status", value: "Free Tier" },
                        { label: "Payment Method", value: "Not required" },
                      ]
                  ).map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        padding: "12px 14px",
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: 8,
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: C.midGray,
                          marginBottom: 4,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color:
                            isPro && label === "AI Itineraries"
                              ? "#5CCC5C"
                              : C.offWhite,
                        }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Round 4 (#7b): cancel-subscription feedback messages.
                    Rendered OUTSIDE the isPro/!isPro branch so they survive
                    the plan-flip after a successful cancel — otherwise the
                    success toast would unmount immediately. */}
                {cancelMessage && (
                  <div
                    style={{
                      padding: "10px 14px",
                      background: "rgba(50,180,50,0.08)",
                      border: "1px solid rgba(50,180,50,0.3)",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "#5CCC5C",
                      marginBottom: 12,
                    }}
                  >
                    {cancelMessage}
                  </div>
                )}
                {cancelError && (
                  <div
                    role="alert"
                    style={{
                      padding: "10px 14px",
                      background: "rgba(200,50,50,0.1)",
                      border: "1px solid rgba(200,50,50,0.4)",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "#FF8080",
                      marginBottom: 12,
                    }}
                  >
                    {cancelError}
                  </div>
                )}

                {isPro ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div
                      style={{
                        padding: "12px 16px",
                        background: "rgba(50,180,50,0.1)",
                        border: "1px solid rgba(50,180,50,0.3)",
                        borderRadius: 8,
                        fontSize: 13,
                        color: "#5CCC5C",
                      }}
                    >
                      ✓ Pro plan active — enjoy unlimited AI-powered itineraries!
                    </div>

                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={cancelling}
                      style={{
                        alignSelf: "flex-start",
                        padding: "9px 16px",
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 6,
                        color: C.midGray,
                        fontSize: 12,
                        fontFamily: "'DM Sans', sans-serif",
                        cursor: cancelling ? "not-allowed" : "pointer",
                        opacity: cancelling ? 0.5 : 1,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!cancelling) {
                          e.currentTarget.style.color = "#FF8080";
                          e.currentTarget.style.borderColor = "rgba(200,50,50,0.4)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!cancelling) {
                          e.currentTarget.style.color = C.midGray;
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                        }
                      }}
                    >
                      {cancelling ? "Cancelling…" : "Cancel subscription"}
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-primary"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      padding: 14,
                    }}
                    onClick={() => setShowUpgrade(true)}
                  >
                    ⭐ Upgrade to Pro — PKR 2,500/month
                  </button>
                )}
              </div>
              {!isPro && (
                <div className="card" style={{ padding: "24px 32px" }}>
                  <h3
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 16,
                      marginBottom: 16,
                    }}
                  >
                    Pro Features
                  </h3>
                  {[
                    "Unlimited AI itineraries",
                    "Priority generation (sub-10s)",
                    "PDF export & sharing",
                    "WhatsApp trip alerts",
                    "Advanced budget analytics",
                    "Exclusive destination insights",
                  ].map((f) => (
                    <div
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 13,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ color: "#5CCC5C", fontWeight: 700 }}>
                        ✓
                      </span>{" "}
                      <span style={{ color: C.midGray }}>{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DANGER */}
          {section === "danger" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="card" style={{ padding: "28px 32px" }}>
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 20,
                    marginBottom: 4,
                  }}
                >
                  Sign Out
                </h2>
                <p style={{ color: C.midGray, fontSize: 13, marginBottom: 20 }}>
                  Sign out of your VoyageurAI account on this device.
                </p>
                <button
                  onClick={onLogout}
                  className="btn-secondary"
                  style={{ fontSize: 13, padding: "10px 24px" }}
                >
                  Sign out
                </button>
              </div>
              <div
                className="card"
                style={{
                  padding: "28px 32px",
                  borderColor: "rgba(200,50,50,0.3)",
                }}
              >
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 20,
                    marginBottom: 4,
                    color: "#FF6B6B",
                  }}
                >
                  Danger Zone
                </h2>
                <p style={{ color: C.midGray, fontSize: 13, marginBottom: 20 }}>
                  These actions are permanent and cannot be undone.
                </p>
                {["Delete Account"].map((label) => (
                  <button
                    key={label}
                    style={{
                      padding: "10px 20px",
                      background: "transparent",
                      border: "1.5px solid rgba(200,50,50,0.4)",
                      borderRadius: 4,
                      color: "#FF6B6B",
                      cursor: "pointer",
                      fontSize: 13,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(200,50,50,0.1)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stripe Upgrade Modal (Replaces mock payment) ──────────────────────────
function UpgradeModal({ user, onClose, onUserUpdate }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleUpgrade = async () => {
    setProcessing(true);
    setError("");
    
    try {
      const response = await createCheckoutSession();
      if (response.success && response.data.url) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.url;
      } else {
        setError(response.message || "Failed to create checkout session");
      }
    } catch (err) {
      console.error("Upgrade error:", err);
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 480,
          padding: 36,
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "transparent",
            border: "none",
            color: C.midGray,
            cursor: "pointer",
            fontSize: 20,
          }}
        >
          ×
        </button>
        
        <h2
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 24,
            marginBottom: 6,
          }}
        >
          Upgrade to Pro
        </h2>
        <p style={{ color: C.midGray, fontSize: 13, marginBottom: 24 }}>
          Unlock unlimited AI-powered itineraries
        </p>
        
        <div
          style={{
            padding: "16px 20px",
            borderRadius: 8,
            border: `2px solid ${C.crimson}`,
            background: "rgba(140,50,50,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Monthly Plan</div>
            <div style={{ fontSize: 11, color: "#5CCC5C", marginTop: 2 }}>
              Cancel anytime
            </div>
          </div>
          <div>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                fontFamily: "'Playfair Display',serif",
              }}
            >
              PKR 2,500
            </span>
            <span style={{ fontSize: 12, color: C.midGray }}>
              /month
            </span>
          </div>
        </div>
        
        <div style={{ marginBottom: 20 }}>
          {[
            "Unlimited AI itineraries",
            "Priority generation (sub-10s)",
            "PDF export & sharing",
            "WhatsApp trip alerts",
            "Advanced budget analytics",
            "Exclusive destination insights",
          ].map((f) => (
            <div
              key={f}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              <span style={{ color: "#5CCC5C", fontWeight: 700 }}>✓</span>
              <span style={{ color: C.midGray }}>{f}</span>
            </div>
          ))}
        </div>
        
        {error && (
          <div
            style={{
              background: "rgba(200,50,50,0.12)",
              border: `1px solid ${C.crimson}`,
              borderRadius: 6,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 13,
              color: "#FF6B6B",
            }}
          >
            {error}
          </div>
        )}
        
        <button
          className="btn-primary"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: 14,
            marginTop: 8,
          }}
          onClick={handleUpgrade}
          disabled={processing}
        >
          {processing ? "Processing..." : "⭐ Proceed to Checkout"}
        </button>
        
        <p
          style={{
            textAlign: "center",
            color: C.midGray,
            fontSize: 11,
            marginTop: 12,
          }}
        >
          🔒 Test mode — use card 4242 4242 4242 4242
        </p>
      </div>
    </div>
  );
}