import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../styles/colors";
import { Icon } from "../components/Icon";
import { tripService } from "../services/tripService";
import ItineraryHero from "../components/itinerary/ItineraryHero";
import ItinerarySummary from "../components/itinerary/ItinerarySummary";
import DaySidebar from "../components/itinerary/DaySidebar";
import DayDetails from "../components/itinerary/DayDetails";
import RefinePanel from "../components/itinerary/RefinePanel";

export default function ItineraryView({ trip, onBack }) {
  const navigate = useNavigate();
  const [activeDay, setActiveDay] = useState(0);
  const [fullTrip, setFullTrip] = useState(trip);
  const [loading, setLoading] = useState(false);

  // Read user from localStorage (kept in sync by AuthPage / ProfilePage).
  // Refinement availability depends on user.plan === 'pro'.
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
    // If the incoming trip is a different id, swap it in and let the fetch effect run.
    // If it's the same id but richer (has itinerary), upgrade our copy.
    setFullTrip((prev) => {
      if (!prev) return trip;
      if (prev._id !== trip._id) {
        // reset day index when switching trips
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

  // Safety check - prevent crash if trip is undefined
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

  // Callback from RefinePanel after a successful refine — receives the
  // updated trip from the API and we swap it into local state. We also clamp
  // activeDay in case the new itinerary has fewer days than the old one.
  const handleTripUpdated = (updatedTrip) => {
    setFullTrip(updatedTrip);
    if (updatedTrip.itinerary && activeDay >= updatedTrip.itinerary.length) {
      setActiveDay(0);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.nearBlack }}>
      <ItineraryHero trip={fullTrip} onBack={onBack} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 5% 60px" }}>
        <ItinerarySummary trip={fullTrip} />

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

        {/* Round 7: conversational refinement panel — Pro feature */}
        {days.length > 0 && (
          <RefinePanel
            trip={fullTrip}
            isPro={isPro}
            onTripUpdated={handleTripUpdated}
            onUpgradeClick={() => navigate("/profile?tab=billing")}
          />
        )}
      </div>
    </div>
  );
}