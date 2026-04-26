import { useState, useEffect } from "react";
import { C } from "../styles/colors";
import { CHATBOT_QUESTIONS, DESTINATIONS } from "../constants/data";
import { generateItineraryWithAI } from "../constants/config";
import { tripService } from "../services/tripService";
import TripHeader from "../components/trip/TripHeader";
import TripProgress from "../components/trip/TripProgress";
import ChatList from "../components/trip/ChatList";
import ChatInput from "../components/trip/ChatInput";
import { Icon } from "../components/Icon";

const FREE_LIMIT = 5;

export default function TripCreator({ user, onBack, onComplete }) {
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Welcome to the Strategic Planner. I will assist you in architecting a comprehensive travel masterplan. To begin, please specify your point of departure.",
    },
  ]);
  const [currentQ, setCurrentQ] = useState(0);
  const [input, setInput] = useState("");
  const [answers, setAnswers] = useState({});
  const [generating, setGenerating] = useState(false);
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

  // Helper function to map backend activity types to frontend types
  const mapActivityType = (type) => {
    if (type === "dining") return "restaurant";
    if (type === "leisure") return "activity";
    if (type === "transport") return "activity";
    return type || "activity";
  };

  // Helper function to transform backend response to frontend format
  const transformAIResponse = (aiData) => {
    // Map days array to itinerary array
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
      emergencyNumbers:
        aiData.emergencyNumbers || "15 (Police), 1122 (Medical)",
    };
  };

  // If limit already hit, show upgrade wall immediately
  if (isLimitHit) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.nearBlack,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "rgba(140,50,50,0.15)",
              border: `2px solid ${C.crimson}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              fontSize: 32,
            }}
          >
            <Icon.crown />
          </div>
          <p className="section-label" style={{ marginBottom: 8 }}>
            Free Plan Limit
          </p>
          <h1
            className="display-heading"
            style={{ fontSize: "clamp(24px,4vw,36px)", marginBottom: 14 }}
          >
            You've used all {FREE_LIMIT} free trips
          </h1>
          <p
            style={{
              color: C.midGray,
              fontSize: 15,
              lineHeight: 1.7,
              marginBottom: 36,
            }}
          >
            Upgrade to{" "}
            <strong style={{ color: C.offWhite }}>VoyageurAI Pro</strong> for
            unlimited AI-powered itinerary generation, priority support, and
            advanced planning features.
          </p>

          <div
            className="card"
            style={{
              padding: "24px 28px",
              textAlign: "left",
              marginBottom: 24,
            }}
          >
            {[
              "Unlimited AI itinerary generation",
              "Priority support & faster responses",
              "Export itineraries as PDF",
              "Exclusive destination insights",
            ].map((f) => (
              <div
                key={f}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 14,
                  paddingBottom: 10,
                  marginBottom: 10,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span style={{ color: C.crimson, fontWeight: 700 }}>✓</span>
                <span style={{ color: C.offWhite }}>{f}</span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
              }}
            >
              <span style={{ color: C.crimson, fontWeight: 700 }}>✓</span>
              <span style={{ color: C.offWhite }}>Cancel anytime</span>
            </div>
          </div>

          <button
            className="btn-primary"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "16px",
              marginBottom: 12,
            }}
          >
            <Icon.crown /> Upgrade to Pro
          </button>
          <button
            onClick={onBack}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              color: C.midGray,
              cursor: "pointer",
              fontSize: 14,
              padding: "10px",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Normal chatbot flow ────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || generating) return;
    const userMsg = input.trim();
    setInput("");

    const q = CHATBOT_QUESTIONS[currentQ];
    if (!q) {
      setError("System error. Please try again.");
      return;
    }

    if (userMsg.toLowerCase() === "retry" && error) {
      setError(null);
      setGenerating(false);
      setMessages((m) => [
        ...m,
        { from: "bot", text: `Let's try again. ${q.question}` },
      ]);
      return;
    }

    const newAnswers = { ...answers, [q.id]: userMsg };
    setAnswers(newAnswers);
    setMessages((m) => [...m, { from: "user", text: userMsg }]);

    if (currentQ < CHATBOT_QUESTIONS.length - 1) {
      await new Promise((r) => setTimeout(r, 600));
      const next = CHATBOT_QUESTIONS[currentQ + 1];
      setMessages((m) => [...m, { from: "bot", text: next.question }]);
      setCurrentQ((c) => c + 1);
    } else {
      await new Promise((r) => setTimeout(r, 600));
      setMessages((m) => [
        ...m,
        {
          from: "bot",
          text: `Phase 1 Data Synthesis Complete. Parameters received:\n- Origin: ${newAnswers.origin}\n- Destination: ${newAnswers.destination}\n- Duration: ${newAnswers.days} days from ${newAnswers.startDate}\n- Budget Allocation: PKR ${newAnswers.budget}\n\nInitiating algorithmic generation for your personalized itinerary...`,
        },
      ]);
      setGenerating(true);
      setError(null);

      for (let i = 0; i < genSteps.length; i++) {
        setGenStep(i);
        await new Promise((r) => setTimeout(r, 700));
      }

      try {
        const aiResponse = await generateItineraryWithAI(newAnswers);

        // Transform the AI response to frontend format
        const transformedData = transformAIResponse(aiResponse);

        const newTrip = {
          destination: newAnswers.destination,
          origin: newAnswers.origin,
          days: parseInt(newAnswers.days || 0),
          budget: parseInt(newAnswers.budget || 0),
          startDate: newAnswers.startDate,
          dates: `${newAnswers.startDate} · ${newAnswers.days} days`,
          image: (() => {
            const dest = newAnswers.destination.toLowerCase();
            const found = DESTINATIONS.find(
              (d) =>
                dest.includes(d.name.toLowerCase()) ||
                d.name.toLowerCase().includes(dest.split(",")[0].trim()),
            );
            return found
              ? found.img
              : "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800";
          })(),
          // Use transformed data
          itinerary: transformedData.itinerary,
          summary: transformedData.summary,
          totalCost: transformedData.totalCost,
          tips: transformedData.tips,
          bestTimeToVisit: transformedData.bestTimeToVisit,
          currency: transformedData.currency,
          language: transformedData.language,
          emergencyNumbers: transformedData.emergencyNumbers,
          status: "upcoming",
        };

        // Save to backend
        try {
          const saved = await tripService.saveTrip(newTrip);
          onComplete(saved);
        } catch (saveErr) {
          console.error("Save failed, showing local trip:", saveErr);
          onComplete(newTrip);
        }
      } catch (err) {
        setGenerating(false);
        const msg = err.message || "Generation failed.";

        // Free trip limit reached on the backend side
        if (
          msg.includes("free trips") ||
          msg.includes("upgrade") ||
          msg.includes("Upgrade")
        ) {
          setError(msg);
          setMessages((m) => [
            ...m,
            {
              from: "bot",
              text: "⚠️ " + msg + " Type anything to go back to the dashboard.",
            },
          ]);
          setTimeout(onBack, 4000);
          return;
        }

        setMessages((m) => [
          ...m,
          {
            from: "bot",
            text: `⚠️ ${msg} — Type "retry" to try again or check your connection.`,
          },
        ]);
        setError(msg);
      }
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.nearBlack,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TripHeader onBack={onBack} user={user} />
      <TripProgress
        currentQ={currentQ}
        totalQuestions={CHATBOT_QUESTIONS.length}
        generating={generating}
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
          paddingBottom: 120,
        }}
      >
        <ChatList
          messages={messages}
          generating={generating}
          genStep={genStep}
          genSteps={genSteps}
        />
      </div>
      <ChatInput
        input={input}
        setInput={setInput}
        onSend={handleSend}
        error={error}
        currentQ={currentQ}
        generating={generating}
      />
    </div>
  );
}
