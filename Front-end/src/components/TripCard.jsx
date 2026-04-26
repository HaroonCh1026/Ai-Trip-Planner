import { useState } from "react";
import { C } from "../styles/colors";
import { Icon } from "./Icon";

export default function TripCard({ trip, onClick, onMarkComplete, onMarkCancelled }) {
  const [menuOpen, setMenuOpen] = useState(false);
  if (!trip) return null;

  const isUpcoming = !trip.status || trip.status === "upcoming";
  const isCompleted = trip.status === "completed";
  const isCancelled = trip.status === "cancelled";

  const statusBg = isCompleted ? "rgba(50,140,50,0.85)" : isCancelled ? "rgba(100,100,100,0.85)" : `rgba(140,50,50,0.85)`;

  return (
    <div className="hover-lift" style={{ borderRadius: 12, overflow: "visible", cursor: "pointer", border: "1px solid rgba(140,50,50,0.15)", background: C.darkGray, position: "relative" }}>
      {/* Image area */}
      <div style={{ position: "relative", height: 180, borderRadius: "12px 12px 0 0", overflow: "hidden" }} onClick={onClick}>
        <img src={trip.image} alt={trip.destination}
          onError={(e) => { e.target.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Hunza_Valley_Pakistan.jpg/800px-Hunza_Valley_Pakistan.jpg"; }}
          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,13,13,0.9) 0%, transparent 55%)" }} />
        <div style={{ position: "absolute", top: 14, right: 14, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: statusBg }}>
          {isCompleted ? "✓ Completed" : isCancelled ? "Cancelled" : "Upcoming"}
        </div>
        <div style={{ position: "absolute", bottom: 14, left: 16 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 600 }}>{trip.destination}</div>
          <div style={{ fontSize: 12, color: "rgba(242,242,242,0.7)", marginTop: 2 }}>{trip.origin} · {trip.days} days</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div onClick={onClick}>
          <div style={{ fontSize: 12, color: C.midGray }}>{trip.dates}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.offWhite, marginTop: 2 }}>PKR {Number(trip.budget || 0).toLocaleString()}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.crimson, fontSize: 13, fontWeight: 500 }} onClick={onClick}>
            View <Icon.arrow />
          </div>
          {/* Actions menu — only for upcoming trips */}
          {isUpcoming && (onMarkComplete || onMarkCancelled) && (
            <div style={{ position: "relative" }}>
              <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: C.midGray, cursor: "pointer", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontFamily: "'DM Sans', sans-serif" }}>
                ⋯
              </button>
              {menuOpen && (
                <div style={{ position: "absolute", right: 0, bottom: 40, background: C.darkGray, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, boxShadow: "0 12px 40px rgba(0,0,0,0.5)", zIndex: 100, minWidth: 180, overflow: "hidden" }}
                  onMouseLeave={() => setMenuOpen(false)}>
                  {onMarkComplete && (
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onMarkComplete(); }}
                      style={{ width: "100%", padding: "12px 16px", background: "transparent", border: "none", color: "#5CCC5C", cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(50,180,50,0.1)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      ✓ Mark as Completed
                    </button>
                  )}
                  {onMarkCancelled && (
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onMarkCancelled(); }}
                      style={{ width: "100%", padding: "12px 16px", background: "transparent", border: "none", color: C.midGray, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", textAlign: "left", display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(200,50,50,0.08)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      ✕ Cancel Trip
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
