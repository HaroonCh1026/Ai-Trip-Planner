import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../styles/colors";
import { Icon } from "../components/Icon";
import { tripService } from "../services/tripService";
import ItineraryHero from "../components/itinerary/ItineraryHero";
import ItinerarySummary from "../components/itinerary/ItinerarySummary";
import DaySidebar from "../components/itinerary/DaySidebar";
import DayDetails from "../components/itinerary/DayDetails";
import PdfExportButton from "../components/itinerary/PdfExportButton";
import CostComparisonPanel from "../components/itinerary/CostComparisonPanel";
import FeasibilityWarnings from "../components/itinerary/FeasibilityWarnings";
import WhyUsPanel from "../components/itinerary/WhyUsPanel";
import BookTripButton from "../components/itinerary/BookTripButton";
import InsiderTipsPanel from "../components/itinerary/InsiderTipsPanel";
import ConfirmModal from "../components/ui/ConfirmModal";

export default function ItineraryView({ trip, onBack }) {
  const navigate = useNavigate();
  const [activeDay, setActiveDay] = useState(0);
  const [fullTrip, setFullTrip] = useState(trip);
  const [loading, setLoading] = useState(false);
  // Upgrade-prompt modal state. Used by Pro-gated CTAs (PDF export, Insider
  // Tips panel) so Free users get a clear upgrade prompt before being
  // redirected to the billing tab. Without this, the CTA click would jump
  // the user away from the page abruptly.
  const [upgradeConfirm, setUpgradeConfirm] = useState(null);

  // Helper: build a confirm-modal payload for any Pro-gated feature.
  const promptUpgrade = (featureName) => {
    setUpgradeConfirm({
      title: `${featureName} is a Pro feature`,
      message: `Upgrade to Pro to unlock ${featureName.toLowerCase()} and all other Pro benefits including unlimited trips and exclusive Insider Tips.`,
      confirmLabel: "Upgrade Now",
      cancelLabel: "Maybe Later",
      onConfirm: () => navigate("/profile?tab=billing"),
    });
  };

  // Read user from localStorage (kept in sync by AuthPage / ProfilePage).
  // PDF export availability depends on user.plan === 'pro'.
  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); }
    catch { return null; }
  })();
  const isPro = user?.plan === "pro";

  // Keep fullTrip in sync with the incoming trip prop.
  // This matters when the route id changes (user navigates /itinerary/a -> /itinerary/b)
  // and when the parent passes in a richer trip (with itinerary) after we mounted on a stub.
  useEffect(() => {
    if (!trip) return;
    setFullTrip((prev) => {
      if (!prev) return trip;
      if (prev._id !== trip._id) {
        setActiveDay(0);
        return trip;
      }
      const prevHas = prev.itinerary && prev.itinerary.length > 0;
      const nextHas = trip.itinerary && trip.itinerary.length > 0;
      if (!prevHas && nextHas) return trip;
      return prev;
    });
  }, [trip?._id, trip?.itinerary?.length]);

  // Fetch full trip details if we only have the dashboard version (without itinerary)
  useEffect(() => {
    const loadFullTrip = async () => {
      const hasItinerary = fullTrip?.itinerary && fullTrip.itinerary.length > 0;
      if (!hasItinerary && fullTrip?._id) {
        setLoading(true);
        try {
          const fetchedTrip = await tripService.getTripById(fullTrip._id);
          setFullTrip(fetchedTrip);
        } catch (err) {
          console.error("Failed to load full trip details:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    loadFullTrip();
  }, [fullTrip?._id]);

  // Safety check
  if (!fullTrip) return null;

  const days = fullTrip.itinerary || [];
  const currentDay = days[activeDay];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.nearBlack, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: C.midGray }}>Loading itinerary details...</div>
      </div>
    );
  }

  // Refinement callback removed in Round 3 (issue #2).

  return (
    <div style={{ minHeight: "100vh", background: C.nearBlack }}>
      <ItineraryHero trip={fullTrip} onBack={onBack} />

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 clamp(16px, 5vw, 48px) 60px",
        }}
      >
        {/* PDF export button — top-right, above the summary. Only shown when
            we actually have content to export. */}
        {days.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 16, marginBottom: -8 }}>
            <PdfExportButton
              trip={fullTrip}
              isPro={isPro}
              targetId="itinerary-pdf-target"
              onUpgradeClick={() => promptUpgrade("PDF Export")}
            />
          </div>
        )}

        <ItinerarySummary trip={fullTrip} />

        {/* Day 2: ML cost reality check — only renders if mlPrediction exists */}
        <CostComparisonPanel trip={fullTrip} />

        {/* Day 3: feasibility warnings — only renders if violations were found */}
        <FeasibilityWarnings trip={fullTrip} />

        {/* Day 4: comparison vs other booking options — always renders */}
        {days.length > 0 && <WhyUsPanel trip={fullTrip} />}

        {days.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ marginBottom: 16, color: C.midGray }}>
              <Icon.map width="48" height="48" />
            </div>
            <p style={{ color: C.midGray }}>
              Itinerary details not available for this trip.
            </p>
          </div>
        ) : (
          <div
            className="vai-day-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "280px 1fr",
              gap: 32,
              paddingTop: 32,
            }}
          >
            <DaySidebar
              days={days}
              activeDay={activeDay}
              setActiveDay={setActiveDay}
              trip={fullTrip}
            />

            <DayDetails currentDay={currentDay} activeDay={activeDay} />
          </div>
        )}

        {/* Day 4: Book This Trip CTA — appears between day grid and insider tips.
            Component handles the entire two-step flow (preview → confirm) and
            navigates to the confirmation page on success. */}
        {days.length > 0 && <BookTripButton trip={fullTrip} />}

        {/* Day 4 Msg 2: Insider Tips — Pro feature. AI-generated local tips
            that complement the itinerary (hidden gems, halal food, photo
            spots, female-traveler safety, cultural notes). Cached on the
            trip after first generation so subsequent visits are instant. */}
        {days.length > 0 && (
          <InsiderTipsPanel
            trip={fullTrip}
            isPro={isPro}
            onUpgradeClick={() => promptUpgrade("Insider Tips")}
          />
        )}

        {/* Round 3 (issue #2): RefinePanel removed. */}

        {/* ── Hidden PDF export target ────────────────────────────────────
         * Rendered off-screen so users never see it, but html2canvas can
         * rasterize it. Contains the trip header + every day in sequence
         * so the PDF includes the FULL itinerary, not just whichever day
         * is active in the sidebar. */}
        {days.length > 0 && (
          <div
            id="itinerary-pdf-target"
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-10000px",
              top: 0,
              width: 794, // A4 width @ 96dpi
              background: "#0d0d0d",
              color: C.offWhite,
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1.5,
            }}
          >
            {/* ─── COVER PAGE ─────────────────────────────────────────────
             * First "page" of the PDF. Big destination name centered, dates,
             * traveler context, branded logo. Looks like a magazine cover
             * when rendered at full A4 height. */}
            <div
              style={{
                minHeight: 1100, // approx A4 height @ 96dpi
                padding: "60px 50px",
                background: "linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)",
                borderBottom: `4px solid ${C.crimson}`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxSizing: "border-box",
              }}
            >
              {/* Top — branded logo */}
              <div>
                <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, fontWeight: 700, color: C.offWhite }}>
                  Voyageur<span style={{ color: C.crimson }}>AI</span>
                </div>
                <div style={{ fontSize: 11, color: C.midGray, textTransform: "uppercase", letterSpacing: "0.15em", marginTop: 4 }}>
                  Pakistan AI Travel Planner
                </div>
              </div>

              {/* Center — destination headline */}
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 12, color: C.crimson, textTransform: "uppercase", letterSpacing: "0.25em", marginBottom: 14, fontWeight: 600 }}>
                  Your Itinerary For
                </div>
                <h1
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: 64,
                    fontWeight: 900,
                    margin: "0 0 16px",
                    lineHeight: 1.1,
                    color: C.offWhite,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {fullTrip.destination}
                </h1>
                <div style={{ fontSize: 16, color: C.midGray, fontStyle: "italic", marginBottom: 30 }}>
                  From {fullTrip.origin}
                </div>

                {/* Trip stats row */}
                <div style={{ display: "flex", justifyContent: "center", gap: 50, marginTop: 50, flexWrap: "wrap" }}>
                  {[
                    { label: "Duration", value: `${fullTrip.days} days` },
                    { label: "Departure", value: fullTrip.startDate || "—" },
                    { label: "Budget", value: `PKR ${Number(fullTrip.budget || 0).toLocaleString()}` },
                  ].map((stat) => (
                    <div key={stat.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: C.midGray, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6, fontWeight: 600 }}>
                        {stat.label}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: C.offWhite }}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom — generated date */}
              <div style={{ textAlign: "center", fontSize: 11, color: C.midGray, letterSpacing: "0.1em" }}>
                Generated on {new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>

            {/* ─── OVERVIEW PAGE ──────────────────────────────────────────
             * Trip summary + cost breakdown table on a clean second page. */}
            <div style={{ padding: "60px 50px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 11, color: C.crimson, textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 12 }}>
                Trip Overview
              </div>
              <h2
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 32,
                  fontWeight: 700,
                  margin: "0 0 24px",
                  color: C.offWhite,
                  lineHeight: 1.2,
                }}
              >
                A {fullTrip.days}-day journey through {fullTrip.destination}
              </h2>

              {fullTrip.summary && (
                <p style={{ fontSize: 15, lineHeight: 1.75, color: "rgba(232,232,232,0.85)", marginBottom: 32 }}>
                  {fullTrip.summary}
                </p>
              )}

              {/* Cost breakdown table */}
              <div style={{ marginTop: 36 }}>
                <div style={{ fontSize: 11, color: C.crimson, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginBottom: 14 }}>
                  Estimated Cost Breakdown
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.crimson}` }}>
                      <th style={{ textAlign: "left", padding: "10px 0", color: C.midGray, fontWeight: 600, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.1em" }}>Day</th>
                      <th style={{ textAlign: "left", padding: "10px 0", color: C.midGray, fontWeight: 600, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.1em" }}>Highlight</th>
                      <th style={{ textAlign: "right", padding: "10px 0", color: C.midGray, fontWeight: 600, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.1em" }}>Cost (PKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((d, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <td style={{ padding: "12px 0", fontWeight: 600, color: C.offWhite }}>Day {d.day || i + 1}</td>
                        <td style={{ padding: "12px 0", color: "rgba(232,232,232,0.85)" }}>{d.title || "—"}</td>
                        <td style={{ padding: "12px 0", textAlign: "right", color: C.offWhite, fontFamily: "'DM Mono', monospace" }}>
                          {Number(d.dailyCost || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: `2px solid ${C.crimson}`, background: "rgba(140,50,50,0.06)" }}>
                      <td colSpan={2} style={{ padding: "14px 0", fontWeight: 700, color: C.crimson, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12 }}>
                        Total Estimated
                      </td>
                      <td style={{ padding: "14px 0", textAlign: "right", color: C.crimson, fontWeight: 700, fontSize: 16, fontFamily: "'DM Mono', monospace" }}>
                        PKR {Number(fullTrip.totalCost || 0).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Budget delta indicator */}
                {fullTrip.budget > 0 && fullTrip.totalCost > 0 && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: "10px 14px",
                      borderRadius: 4,
                      fontSize: 12,
                      background:
                        fullTrip.totalCost <= fullTrip.budget
                          ? "rgba(0,180,140,0.08)"
                          : "rgba(255,180,0,0.08)",
                      border:
                        fullTrip.totalCost <= fullTrip.budget
                          ? "1px solid rgba(0,180,140,0.3)"
                          : "1px solid rgba(255,180,0,0.4)",
                      color:
                        fullTrip.totalCost <= fullTrip.budget
                          ? "rgb(120,220,180)"
                          : "#FFB400",
                    }}
                  >
                    {fullTrip.totalCost <= fullTrip.budget
                      ? `✓ Estimated cost is within budget (saving PKR ${Number(fullTrip.budget - fullTrip.totalCost).toLocaleString()})`
                      : `⚠ Estimated cost exceeds budget by PKR ${Number(fullTrip.totalCost - fullTrip.budget).toLocaleString()}`}
                  </div>
                )}
              </div>
            </div>

            {/* ─── DAY-BY-DAY ─────────────────────────────────────────────
             * Each day = a self-contained card with header bar, activity
             * timeline (vertical line + dots), pill-style time badges,
             * and a clearly separated hotel section. */}
            <div style={{ padding: "50px 50px 30px" }}>
              <div style={{ fontSize: 11, color: C.crimson, textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 6 }}>
                Day-by-Day Itinerary
              </div>
              <h2
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 28,
                  fontWeight: 700,
                  margin: "0 0 32px",
                  color: C.offWhite,
                }}
              >
                Your Day-By-Day Plan
              </h2>

              {days.map((d, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 32,
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  {/* Day card header bar */}
                  <div
                    style={{
                      padding: "16px 22px",
                      background: `linear-gradient(90deg, ${C.crimson} 0%, rgba(140,50,50,0.7) 100%)`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600 }}>
                        Day {d.day || i + 1}
                      </div>
                      <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: "#fff", marginTop: 2 }}>
                        {d.title || `Day ${d.day || i + 1}`}
                      </div>
                    </div>
                    {d.dailyCost > 0 && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Daily Cost</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "'DM Mono', monospace" }}>
                          PKR {Number(d.dailyCost).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Day card body */}
                  <div style={{ padding: "22px 24px" }}>
                    {/* Activities timeline */}
                    {(d.activities || []).map((a, j) => (
                      <div
                        key={j}
                        style={{
                          position: "relative",
                          paddingLeft: 26,
                          paddingBottom: 18,
                          borderLeft: j < (d.activities || []).length - 1 ? "2px solid rgba(140,50,50,0.25)" : "none",
                          marginLeft: 4,
                        }}
                      >
                        {/* Timeline dot */}
                        <div
                          style={{
                            position: "absolute",
                            left: -7,
                            top: 0,
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: C.crimson,
                            border: "3px solid #0d0d0d",
                            boxSizing: "border-box",
                          }}
                        />

                        {/* Time pill + name */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                          {a.time && (
                            <span
                              style={{
                                padding: "3px 10px",
                                background: "rgba(140,50,50,0.18)",
                                color: C.crimson,
                                fontSize: 11,
                                fontFamily: "'DM Mono', monospace",
                                fontWeight: 600,
                                borderRadius: 4,
                                letterSpacing: "0.05em",
                              }}
                            >
                              {a.time}
                            </span>
                          )}
                          {a.duration && (
                            <span style={{ fontSize: 11, color: C.midGray }}>
                              {a.duration}
                            </span>
                          )}
                          {a.cost > 0 && (
                            <span style={{ fontSize: 11, color: C.midGray, fontFamily: "'DM Mono', monospace" }}>
                              · PKR {Number(a.cost).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: C.offWhite, marginBottom: 4 }}>
                          {a.name}
                        </div>
                        {a.location && (
                          <div style={{ fontSize: 12, color: C.midGray, marginBottom: 4 }}>
                            📍 {a.location}
                          </div>
                        )}
                        {a.tips && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "rgba(232,232,232,0.7)",
                              fontStyle: "italic",
                              padding: "6px 10px",
                              background: "rgba(255,255,255,0.03)",
                              borderLeft: `2px solid ${C.crimson}`,
                              borderRadius: 2,
                              marginTop: 6,
                            }}
                          >
                            💡 {a.tips}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Hotel section */}
                    {d.hotel && d.hotel.name && (
                      <div
                        style={{
                          marginTop: 14,
                          padding: "16px 18px",
                          background: "rgba(140,50,50,0.06)",
                          border: "1px solid rgba(140,50,50,0.2)",
                          borderRadius: 6,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 10, color: C.crimson, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginBottom: 4 }}>
                              🏨 Stay
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: C.offWhite }}>
                              {d.hotel.name}
                            </div>
                          </div>
                          {d.hotel.price && (
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.crimson, fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>
                              {d.hotel.price}
                            </div>
                          )}
                        </div>
                        {d.hotel.location && (
                          <div style={{ fontSize: 12, color: C.midGray, marginBottom: 4 }}>
                            📍 {d.hotel.location}
                          </div>
                        )}
                        {d.hotel.why && (
                          <div style={{ fontSize: 12, color: "rgba(232,232,232,0.75)", marginTop: 6, fontStyle: "italic" }}>
                            "{d.hotel.why}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ─── TIPS PAGE ──────────────────────────────────────────────
             * Travel tips collected from the AI, displayed as a card grid. */}
            {fullTrip.tips && fullTrip.tips.length > 0 && (
              <div style={{ padding: "30px 50px 50px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 11, color: C.crimson, textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 6 }}>
                  Insider Tips
                </div>
                <h2
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: 26,
                    fontWeight: 700,
                    margin: "0 0 24px",
                    color: C.offWhite,
                  }}
                >
                  Travel Tips for Your Journey
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                  {fullTrip.tips.map((t, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "14px 18px",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderLeft: `3px solid ${C.crimson}`,
                        borderRadius: 4,
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: "rgba(232,232,232,0.9)",
                      }}
                    >
                      <span style={{ color: C.crimson, fontWeight: 700, marginRight: 8 }}>{(i + 1).toString().padStart(2, "0")}</span>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── FOOTER ─────────────────────────────────────────────────
             * Practical info + branding sign-off. */}
            <div
              style={{
                padding: "30px 50px 40px",
                background: "linear-gradient(180deg, transparent 0%, rgba(140,50,50,0.08) 100%)",
                borderTop: `2px solid ${C.crimson}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: 24 }}>
                {fullTrip.bestTimeToVisit && (
                  <div style={{ flex: "1 1 220px" }}>
                    <div style={{ fontSize: 10, color: C.midGray, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600, marginBottom: 4 }}>
                      Best Time to Visit
                    </div>
                    <div style={{ fontSize: 13, color: C.offWhite }}>
                      {fullTrip.bestTimeToVisit}
                    </div>
                  </div>
                )}
                {fullTrip.currency && (
                  <div style={{ flex: "1 1 180px" }}>
                    <div style={{ fontSize: 10, color: C.midGray, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600, marginBottom: 4 }}>
                      Currency
                    </div>
                    <div style={{ fontSize: 13, color: C.offWhite }}>
                      {fullTrip.currency}
                    </div>
                  </div>
                )}
                {fullTrip.emergencyNumbers && (
                  <div style={{ flex: "1 1 200px" }}>
                    <div style={{ fontSize: 10, color: C.midGray, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600, marginBottom: 4 }}>
                      Emergency
                    </div>
                    <div style={{ fontSize: 13, color: C.offWhite }}>
                      {fullTrip.emergencyNumbers}
                    </div>
                  </div>
                )}
              </div>

              {/* Branded sign-off */}
              <div style={{ textAlign: "center", paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: C.offWhite, marginBottom: 4 }}>
                  Voyageur<span style={{ color: C.crimson }}>AI</span>
                </div>
                <div style={{ fontSize: 11, color: C.midGray, letterSpacing: "0.1em" }}>
                  Your AI-powered Pakistan travel companion
                </div>
                <div style={{ fontSize: 10, color: C.midGray, marginTop: 8 }}>
                  Generated {new Date().toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })} · voyageurai.com
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pro-feature upgrade prompt. Shown when a Free user clicks a
          Pro-gated CTA (PDF export, Insider Tips). The modal closes itself
          on either button click; "Upgrade Now" routes to the billing tab. */}
      <ConfirmModal
        confirm={upgradeConfirm}
        onClose={() => setUpgradeConfirm(null)}
      />
    </div>
  );
}