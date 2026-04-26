import { C } from "../../styles/colors";
import { Icon } from "../Icon";
import { CHATBOT_QUESTIONS } from "../../constants/data";
import CityAutocomplete from "./CityAutocomplete";
import { findCity, formatBudgetHint } from "../../constants/pakistanCities";

export default function ChatInput({
  input,
  setInput,
  onSend,
  error,
  currentQ,
  generating,
  onBack,         // NEW: pop the last answer & re-ask the previous question
}) {
  if (generating) return null;
  if (currentQ >= CHATBOT_QUESTIONS.length) return null;

  const currentQuestion = CHATBOT_QUESTIONS[currentQ];
  const isCityField = currentQuestion?.id === "origin" || currentQuestion?.id === "destination";

  // Show a budget hint inline when the user has typed something in the
  // destination field that we recognize. The hint updates as they type.
  const liveBudgetHint = (() => {
    if (currentQuestion?.id !== "destination" || !input.trim()) return null;
    const city = findCity(input);
    return city ? formatBudgetHint(city) : null;
  })();

  return (
    <div
      style={{
        padding: "20px 5%",
        background: `rgba(13,13,13,0.95)`,
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          maxWidth: 700,
          margin: "0 auto",
        }}
      >
        {/* Live budget hint (shown only when typing destination) */}
        {liveBudgetHint && (
          <div
            style={{
              marginBottom: 10,
              padding: "8px 12px",
              background: "rgba(0,180,140,0.08)",
              border: "1px solid rgba(0,180,140,0.3)",
              borderRadius: 6,
              fontSize: 12,
              color: C.offWhite,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>💡</span>
            <span>{liveBudgetHint}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
          {/* Back button — shown only after the first question */}
          {currentQ > 0 && (
            <button
              onClick={onBack}
              aria-label="Go back to previous question"
              title="Edit previous answer"
              style={{
                flexShrink: 0,
                padding: "0 14px",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 6,
                color: C.midGray,
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.crimson; e.currentTarget.style.color = C.offWhite; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = C.midGray; }}
            >
              ← Back
            </button>
          )}

          {/* Input — autocomplete for city fields, plain input for everything else */}
          {isCityField ? (
            <CityAutocomplete
              value={input}
              onChange={setInput}
              onSubmit={onSend}
              placeholder={currentQuestion?.placeholder || "Type your response..."}
              autoFocus
            />
          ) : (
            <input
              type={currentQuestion?.type || "text"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSend()}
              placeholder={currentQuestion?.placeholder || "Type your response..."}
              style={{ flex: 1, fontSize: 15 }}
              autoFocus
              aria-label={currentQuestion?.label || "Answer"}
            />
          )}

          <button
            className="btn-primary"
            onClick={onSend}
            style={{ flexShrink: 0, padding: "12px 24px" }}
            aria-label="Send answer"
          >
            <Icon.arrow /> Send
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              margin: "8px 0 0",
              color: C.crimson,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}