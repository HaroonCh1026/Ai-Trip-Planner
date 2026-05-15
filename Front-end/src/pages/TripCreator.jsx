import { useState } from "react";
import { C } from "../styles/colors";
import { CHATBOT_QUESTIONS, DESTINATIONS } from "../constants/data";
import { generateItineraryWithAI } from "../constants/config";
import { tripService } from "../services/tripService";
import TripHeader from "../components/trip/TripHeader";
import TripProgress from "../components/trip/TripProgress";
import ChatList from "../components/trip/ChatList";
import ChoicePicker from "../components/trip/ChoicePicker";
import ReviewSummary from "../components/trip/ReviewSummary";
import VehicleSelectStep from "../components/trip/VehicleSelectStep";
import { Icon } from "../components/Icon";

export default function TripCreator({ user, appConfig, onBack, onComplete }) {
  // ── Conversation state ──────────────────────────────────────────────────
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi! I'll help you plan a trip across Pakistan in just a few quick taps. No typing needed — just tap your choices below.",
    },
    {
      from: "bot",
      text: CHATBOT_QUESTIONS[0].question,
    },
  ]);
  const [currentQ, setCurrentQ] = useState(0);
  const [input, setInput] = useState(""); // kept for the "retry on error" fallback path
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState("chat"); // "chat" | "review" | "generating"
  const [genStep, setGenStep] = useState(0);
  const [error, setError] = useState(null);

  const FREE_LIMIT = appConfig?.freeTripLimit ?? 5;
  const tripsUsed = user?.tripsUsed || 0;
  const isLimitHit = user?.plan === "free" && tripsUsed >= FREE_LIMIT;

  const genSteps = [
    "Analyzing your preferences...",
    "Researching destination highlights...",
    "Building your day-by-day schedule...",
    "Finding hotel recommendations...",
    "Calculating cost estimates...",
    "Finalizing your itinerary...",
  ];

  // ── AI response transformer (unchanged) ────────────────────────────────
  const mapActivityType = (type) => {
    if (type === "dining") return "restaurant";
    if (type === "leisure") return "activity";
    if (type === "transport") return "activity";
    return type || "activity";
  };

  const transformAIResponse = (aiData) => {
    const mappedItinerary = (aiData.days || []).map((day) => ({
      day: day.day,
      title: day.title,
      activities: (day.activities || []).map((activity) => ({
        time: activity.time,
        type: mapActivityType(activity.type),
        name: activity.name,
        location: activity.location,
        duration: activity.duration,
        cost: activity.cost,
        tips: activity.tips,
      })),
      hotel: day.hotel
        ? {
            name: day.hotel.name,
            location: day.hotel.location,
            price: day.hotel.price,
            rating: day.hotel.rating,
            why: day.hotel.why,
          }
        : null,
      dailyCost: day.dailyCost,
    }));

    return {
      itinerary: mappedItinerary,
      summary: aiData.summary || "",
      totalCost: aiData.totalEstimatedCost || aiData.totalCost || 0,
      tips: aiData.tips || [],
      bestTimeToVisit: aiData.bestTimeToVisit || "",
      currency: aiData.currency || "Pakistani Rupee (PKR)",
      language: aiData.language || "Urdu/English",
      emergencyNumbers: aiData.emergencyNumbers || "15 (Police), 1122 (Medical)",
      mlPrediction: aiData.mlPrediction || null,
      feasibility: aiData.feasibility || null,
    };
  };

  // ── Format the picker's raw value as a friendly user chat bubble ───────
  // Keeps the UX feeling like a real conversation. The raw value still goes
  // into `answers` so the backend payload is unchanged.
  const formatAnswerForChat = (questionId, rawValue) => {
    if (!rawValue) return rawValue;
    switch (questionId) {
      case "origin":
        return `Starting from: ${rawValue}`;
      case "destination":
        return `Going to: ${rawValue}`;
      case "days":
        return `${rawValue} day${rawValue === "1" ? "" : "s"}`;
      case "startDate":
        try {
          return `Departure: ${new Date(rawValue + "T00:00:00").toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}`;
        } catch {
          return `Departure: ${rawValue}`;
        }
      case "budget":
        return `Budget: PKR ${Number(rawValue).toLocaleString()}`;
      case "preferences":
        return `Interests: ${rawValue}`;
      default:
        return rawValue;
    }
  };

  // ── Free-limit upgrade wall (unchanged) ────────────────────────────────
  if (isLimitHit) {
    return (
      <div style={{ minHeight: "100vh", background: C.nearBlack, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(140,50,50,0.15)", border: `2px solid ${C.crimson}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 32 }}>
            <Icon.crown />
          </div>
          <p className="section-label" style={{ marginBottom: 8 }}>Free Plan Limit</p>
          <h1 className="display-heading" style={{ fontSize: "clamp(24px,4vw,36px)", marginBottom: 14 }}>
            You've used all {FREE_LIMIT} free trips
          </h1>
          <p style={{ color: C.midGray, fontSize: 15, lineHeight: 1.7, marginBottom: 36 }}>
            Upgrade to <strong style={{ color: C.offWhite }}>AI Trip Planner Pro</strong> for unlimited AI-powered itinerary generation, priority support, and advanced planning features.
          </p>
          <div className="card" style={{ padding: "24px 28px", textAlign: "left", marginBottom: 24 }}>
            {["Unlimited AI itinerary generation", "Priority support & faster responses", "Export itineraries as PDF", "Exclusive destination insights"].map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: C.crimson, fontWeight: 700 }}>✓</span>
                <span style={{ color: C.offWhite }}>{f}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
              <span style={{ color: C.crimson, fontWeight: 700 }}>✓</span>
              <span style={{ color: C.offWhite }}>Cancel anytime</span>
            </div>
          </div>
          <button className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "16px", marginBottom: 12 }}>
            <Icon.crown /> Upgrade to Pro
          </button>
          <button onClick={onBack} style={{ width: "100%", background: "transparent", border: "none", color: C.midGray, cursor: "pointer", fontSize: 14, padding: "10px", fontFamily: "'DM Sans', sans-serif" }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Step forward: store answer, move to next question (or review screen) ─
  // Now accepts an optional value from the GUI picker. Falls back to `input`
  // so any legacy code path that calls handleSend() still works.
  const handleSend = async (valueFromPicker) => {
    if (phase !== "chat") return;
    const raw = valueFromPicker !== undefined ? valueFromPicker : input;
    const userMsg = String(raw || "").trim();
    if (!userMsg) return;

    setInput("");

    const q = CHATBOT_QUESTIONS[currentQ];
    if (!q) return;

    // "retry" hook from earlier behavior — only reachable via the legacy
    // typing path now, but keep it for safety.
    if (userMsg.toLowerCase() === "retry" && error) {
      setError(null);
      setMessages((m) => [...m, { from: "bot", text: `Let's try again. ${q.question}` }]);
      return;
    }

    const newAnswers = { ...answers, [q.id]: userMsg };
    setAnswers(newAnswers);

    // Friendly chat-bubble formatting (e.g. "Budget: PKR 150,000")
    setMessages((m) => [
      ...m,
      { from: "user", text: formatAnswerForChat(q.id, userMsg) },
    ]);

    if (currentQ < CHATBOT_QUESTIONS.length - 1) {
      await new Promise((r) => setTimeout(r, 400));
      const next = CHATBOT_QUESTIONS[currentQ + 1];
      setMessages((m) => [...m, { from: "bot", text: next.question }]);
      setCurrentQ((c) => c + 1);
    } else {
      await new Promise((r) => setTimeout(r, 400));
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          text: "Got it! Take a moment to review your trip details — you can edit anything before we generate your itinerary.",
        },
      ]);
      setPhase("review");
    }
  };

  // ── Special-step submit (vehicle picker — unchanged) ───────────────────
  const handleSpecialSubmit = async (payload) => {
    if (phase !== "chat") return;
    const q = CHATBOT_QUESTIONS[currentQ];
    if (!q || q.type !== "special") return;

    const newAnswers = {
      ...answers,
      vehicleId: payload.vehicleId,
      groupSize: payload.groupSize,
      vehicle: payload.vehicleId,
    };
    setAnswers(newAnswers);

    const groupLabel =
      payload.groupSize === 1
        ? "Just me"
        : payload.groupSize === 2
        ? "2 people"
        : `${payload.groupSize}+ people`;
    setMessages((m) => [
      ...m,
      { from: "user", text: `Vehicle: ${payload.vehicleId} · ${groupLabel}` },
    ]);

    if (currentQ < CHATBOT_QUESTIONS.length - 1) {
      await new Promise((r) => setTimeout(r, 400));
      const next = CHATBOT_QUESTIONS[currentQ + 1];
      setMessages((m) => [...m, { from: "bot", text: next.question }]);
      setCurrentQ((c) => c + 1);
    } else {
      await new Promise((r) => setTimeout(r, 400));
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          text: "Got it! Take a moment to review your trip details — you can edit anything before we generate your itinerary.",
        },
      ]);
      setPhase("review");
    }
  };

  // ── Step back: pop the last Q/A pair and re-ask the previous question ──
  const handleStepBack = () => {
    if (currentQ === 0) return;
    const prevQ = CHATBOT_QUESTIONS[currentQ - 1];

    setMessages((m) => m.slice(0, -2));

    setAnswers((a) => {
      const copy = { ...a };
      if (prevQ.type === "special" && prevQ.id === "vehicle") {
        delete copy.vehicleId;
        delete copy.groupSize;
        delete copy.vehicle;
      } else {
        delete copy[prevQ.id];
      }
      return copy;
    });

    // We no longer need to seed the input box for the GUI flow — the
    // ChoicePicker hydrates from `answers[prevQ.id]` directly. Clear it
    // anyway so the legacy retry path starts clean.
    setInput("");

    setCurrentQ((c) => c - 1);
    setError(null);
  };

  // ── Edit a single answer from the review screen (unchanged) ────────────
  const handleEditField = (fieldId, newValue) => {
    setAnswers((a) => ({ ...a, [fieldId]: newValue }));
  };

  // ── Cancel review and go back to chat (unchanged) ──────────────────────
  const handleReviewCancel = () => {
    setMessages((m) => m.slice(0, -2));
    setAnswers((a) => {
      const copy = { ...a };
      const lastQ = CHATBOT_QUESTIONS[CHATBOT_QUESTIONS.length - 1];
      delete copy[lastQ.id];
      return copy;
    });
    setPhase("chat");
  };

  // ── Confirm review: actually call Gemini (unchanged) ───────────────────
  const handleReviewConfirm = async () => {
    setPhase("generating");
    setError(null);
    setMessages((m) => [
      ...m,
      {
        from: "bot",
        text: `Building your itinerary now...\n- From: ${answers.origin}\n- To: ${answers.destination}\n- ${answers.days} days starting ${answers.startDate}\n- Budget: PKR ${Number(answers.budget || 0).toLocaleString()}`,
      },
    ]);

    for (let i = 0; i < genSteps.length; i++) {
      setGenStep(i);
      await new Promise((r) => setTimeout(r, 700));
    }

    try {
      const aiResponse = await generateItineraryWithAI(answers);
      const transformedData = transformAIResponse(aiResponse);

      const newTrip = {
        destination: answers.destination,
        origin: answers.origin,
        days: parseInt(answers.days || 0),
        budget: parseInt(answers.budget || 0),
        startDate: answers.startDate,
        dates: `${answers.startDate} · ${answers.days} days`,
        ...(answers.vehicleId ? { vehicleId: answers.vehicleId } : {}),
        ...(answers.groupSize ? { groupSize: parseInt(answers.groupSize) } : {}),
        image: (() => {
          const dest = (answers.destination || "").toLowerCase();
          const found = DESTINATIONS.find(
            (d) =>
              dest.includes(d.name.toLowerCase()) ||
              d.name.toLowerCase().includes(dest.split(",")[0].trim()),
          );
          return found
            ? found.img
            : "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800";
        })(),
        itinerary: transformedData.itinerary,
        summary: transformedData.summary,
        totalCost: transformedData.totalCost,
        tips: transformedData.tips,
        bestTimeToVisit: transformedData.bestTimeToVisit,
        currency: transformedData.currency,
        language: transformedData.language,
        emergencyNumbers: transformedData.emergencyNumbers,
        ...(transformedData.mlPrediction
          ? { mlPrediction: transformedData.mlPrediction }
          : {}),
        ...(transformedData.feasibility
          ? { feasibility: transformedData.feasibility }
          : {}),
        status: "upcoming",
      };

      try {
        const saved = await tripService.saveTrip(newTrip);
        onComplete(saved);
      } catch (saveErr) {
        console.error("Save failed, showing local trip:", saveErr);
        onComplete(newTrip);
      }
    } catch (err) {
      const msg = err.message || "Generation failed.";

      if (msg.includes("free trips") || msg.includes("upgrade") || msg.includes("Upgrade")) {
        setError(msg);
        setMessages((m) => [...m, { from: "bot", text: "⚠️ " + msg + " Returning you to the dashboard..." }]);
        setTimeout(onBack, 4000);
        return;
      }

      setError(msg);
      setMessages((m) => [
        ...m,
        { from: "bot", text: `⚠️ ${msg} — Adjust your trip details and try again.` },
      ]);
      setPhase("review");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.nearBlack, display: "flex", flexDirection: "column" }}>
      <TripHeader onBack={onBack} user={user} />
      <TripProgress
        currentQ={currentQ}
        totalQuestions={CHATBOT_QUESTIONS.length}
        generating={phase === "generating"}
      />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          maxWidth: 800,
          width: "100%",
          margin: "0 auto",
          padding: "0 24px",
          paddingBottom: phase === "review" ? 40 : 120,
        }}
      >
        <ChatList
          messages={messages}
          generating={phase === "generating"}
          genStep={genStep}
          genSteps={genSteps}
        />

        {/* Vehicle picker — unchanged */}
        {phase === "chat" &&
          CHATBOT_QUESTIONS[currentQ]?.type === "special" &&
          CHATBOT_QUESTIONS[currentQ]?.id === "vehicle" && (
            <VehicleSelectStep
              defaultGroupSize={Number(answers.groupSize) || 2}
              onSubmit={handleSpecialSubmit}
            />
          )}

        {/* Review screen */}
        {phase === "review" && (
          <ReviewSummary
            answers={answers}
            onConfirm={handleReviewConfirm}
            onEditField={handleEditField}
            onCancel={handleReviewCancel}
          />
        )}
      </div>

      {/* GUI picker (replaces the old ChatInput) */}
      {phase === "chat" && (
        <ChoicePicker
          onSend={handleSend}
          onBack={handleStepBack}
          error={error}
          currentQ={currentQ}
          answers={answers}
          generating={false}
        />
      )}
    </div>
  );
}