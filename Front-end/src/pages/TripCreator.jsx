import { useState } from "react";
import { C } from "../styles/colors";
import { CHATBOT_QUESTIONS, DESTINATIONS } from "../constants/data";
import { generateItineraryWithAI } from "../constants/config";
import { tripService } from "../services/tripService";
import TripHeader from "../components/trip/TripHeader";
import TripProgress from "../components/trip/TripProgress";
import ChatList from "../components/trip/ChatList";
import ChatInput from "../components/trip/ChatInput";
import ReviewSummary from "../components/trip/ReviewSummary";
import VehicleSelectStep from "../components/trip/VehicleSelectStep";
import { Icon } from "../components/Icon";

const FREE_LIMIT = 5;

export default function TripCreator({ user, onBack, onComplete }) {
  // ── Conversation state ──────────────────────────────────────────────────
  // `phase` controls what the user sees:
  //   "chat"      — answering chatbot questions
  //   "review"    — looking at the final review screen, can edit any answer
  //   "generating"— Gemini is running, loader visible
  //
  // We model the chat as a list of messages plus a parallel `answers` map.
  // Going back means popping the last user-message + assistant-message pair
  // off `messages`, decrementing currentQ, and clearing that key from answers.
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi! I'll help you plan a trip across Pakistan in just a few quick questions. Ready when you are — let's start with the basics.",
    },
    {
      from: "bot",
      text: CHATBOT_QUESTIONS[0].question,
    },
  ]);
  const [currentQ, setCurrentQ] = useState(0);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState({});
  const [phase, setPhase] = useState("chat"); // "chat" | "review" | "generating"
  const [genStep, setGenStep] = useState(0);
  const [error, setError] = useState(null);

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

  // ── AI response transformer (unchanged from before) ────────────────────
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
      // Day 2: ML cost prediction snapshot (optional — present only if the
      // Python ML service was online when generation ran). The backend
      // attaches this in ai.controller.ts after Gemini returns. We pass it
      // through here so it ends up on the saved Trip document and the
      // itinerary view can render the cost validation panel.
      mlPrediction: aiData.mlPrediction || null,
      // Day 3: feasibility report (optional — present only if validator
      // found timing/distance issues). Kept on the trip so subsequent
      // visits to the itinerary view re-render the warnings without
      // re-running the validator.
      feasibility: aiData.feasibility || null,
    };
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
            Upgrade to <strong style={{ color: C.offWhite }}>VoyageurAI Pro</strong> for unlimited AI-powered itinerary generation, priority support, and advanced planning features.
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
  const handleSend = async () => {
    if (!input.trim() || phase !== "chat") return;
    const userMsg = input.trim();
    setInput("");

    const q = CHATBOT_QUESTIONS[currentQ];
    if (!q) return;

    // Quick "retry" hook from earlier behavior — keep it for the failure case
    if (userMsg.toLowerCase() === "retry" && error) {
      setError(null);
      setMessages((m) => [...m, { from: "bot", text: `Let's try again. ${q.question}` }]);
      return;
    }

    const newAnswers = { ...answers, [q.id]: userMsg };
    setAnswers(newAnswers);
    setMessages((m) => [...m, { from: "user", text: userMsg }]);

    if (currentQ < CHATBOT_QUESTIONS.length - 1) {
      // More questions to ask
      await new Promise((r) => setTimeout(r, 400));
      const next = CHATBOT_QUESTIONS[currentQ + 1];
      setMessages((m) => [...m, { from: "bot", text: next.question }]);
      setCurrentQ((c) => c + 1);
    } else {
      // Last question answered — go to review screen instead of immediate generate
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

  // ── Special-step submit (Day 3): vehicle picker ──────────────────────────
  // Special chatbot questions (currently just the vehicle picker) render
  // their own UI inline in ChatList instead of using the text input bar.
  // When the user clicks the step's Continue button, this handler fires —
  // it stores BOTH `vehicleId` and `groupSize` in the answers map and
  // advances to the next question, mirroring handleSend's flow.
  const handleSpecialSubmit = async (payload) => {
    if (phase !== "chat") return;
    const q = CHATBOT_QUESTIONS[currentQ];
    if (!q || q.type !== "special") return;

    // Merge the multi-field payload into answers. The `vehicle` slot itself
    // gets a human-readable summary so the review screen can show it nicely.
    const newAnswers = {
      ...answers,
      vehicleId: payload.vehicleId,
      groupSize: payload.groupSize,
      // Slot for ReviewSummary's display logic — ID-to-label mapping kept in
      // the constants module. We resolve it lazily here to avoid yet another
      // import in the review component.
      vehicle: payload.vehicleId,
    };
    setAnswers(newAnswers);

    // Add a synthetic user-bubble in the chat so the conversation reads
    // naturally ("you said: Hiace Van for a family of 4").
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
  // The chat state has: [intro, Q0, A0, Q1, A1, Q2, ...]. After the user
  // has answered Q0 and we've shown Q1, popping back means removing A0 and Q1
  // and decrementing currentQ. We also clear that key from answers.
  const handleStepBack = () => {
    if (currentQ === 0) return; // can't go back from first question
    const prevQ = CHATBOT_QUESTIONS[currentQ - 1];

    // Remove the latest assistant question + the user's previous answer.
    // We always added them in pairs after Q0, so popping 2 messages is correct.
    setMessages((m) => m.slice(0, -2));

    // Clear the previous answer so the user can edit it from scratch.
    // Special steps store multiple fields under different keys — for the
    // vehicle step that's vehicleId + groupSize + vehicle (the display alias).
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

    // Restore the input to whatever the user had typed before, so they can
    // tweak it instead of retyping from zero (only relevant for text steps)
    if (prevQ.type !== "special") {
      setInput(answers[prevQ.id] || "");
    } else {
      setInput("");
    }

    setCurrentQ((c) => c - 1);
    setError(null);
  };

  // ── Edit a single answer from the review screen ────────────────────────
  const handleEditField = (fieldId, newValue) => {
    setAnswers((a) => ({ ...a, [fieldId]: newValue }));
  };

  // ── Cancel review and go back to chat (re-asks the last question) ──────
  const handleReviewCancel = () => {
    // Drop the last bot "review" message, drop the last user answer
    setMessages((m) => m.slice(0, -2));
    setAnswers((a) => {
      const copy = { ...a };
      const lastQ = CHATBOT_QUESTIONS[CHATBOT_QUESTIONS.length - 1];
      delete copy[lastQ.id];
      return copy;
    });
    setPhase("chat");
  };

  // ── Confirm review: actually call Gemini ───────────────────────────────
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

    // Walk through visual loader stages
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
        image: (() => {
          const dest = answers.destination.toLowerCase();
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
        // Day 2: persist ML prediction onto the trip (or null if ML was offline)
        ...(transformedData.mlPrediction
          ? { mlPrediction: transformedData.mlPrediction }
          : {}),
        // Day 3: persist feasibility report onto the trip (or omit if no issues)
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

      // Generation failed — return the user to the review screen so they can
      // tweak inputs and try again, rather than dropping them back at the
      // chat which would require re-typing everything.
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

        {/* Day 3: special chatbot steps render their dedicated UI inline.
            Currently just the vehicle picker. Sits between chat history and
            either the review screen or the input bar at the bottom. */}
        {phase === "chat" &&
          CHATBOT_QUESTIONS[currentQ]?.type === "special" &&
          CHATBOT_QUESTIONS[currentQ]?.id === "vehicle" && (
            <VehicleSelectStep
              defaultGroupSize={Number(answers.groupSize) || 2}
              onSubmit={handleSpecialSubmit}
            />
          )}

        {/* Review screen — appears between chat history and input area */}
        {phase === "review" && (
          <ReviewSummary
            answers={answers}
            onConfirm={handleReviewConfirm}
            onEditField={handleEditField}
            onCancel={handleReviewCancel}
          />
        )}
      </div>

      {/* Input only shown during chat phase */}
      {phase === "chat" && (
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={handleSend}
          onBack={handleStepBack}
          error={error}
          currentQ={currentQ}
          generating={false}
        />
      )}
    </div>
  );
}