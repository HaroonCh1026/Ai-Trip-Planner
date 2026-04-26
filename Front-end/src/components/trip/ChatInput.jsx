import { C } from "../../styles/colors";
import { Icon } from "../Icon";
import { CHATBOT_QUESTIONS } from "../../constants/data";

export default function ChatInput({ 
  input, 
  setInput, 
  onSend, 
  error, 
  currentQ,
  generating 
}) {
  if (generating) return null;
  if (currentQ >= CHATBOT_QUESTIONS.length) return null;

  const currentQuestion = CHATBOT_QUESTIONS[currentQ];

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
          display: "flex",
          gap: 12,
        }}
      >
        <input
          type={currentQuestion?.type || "text"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder={currentQuestion?.placeholder || "Type your response..."}
          style={{ flex: 1, fontSize: 15 }}
          autoFocus
        />
        <button
          className="btn-primary"
          onClick={onSend}
          style={{ flexShrink: 0, padding: "12px 24px" }}
        >
          <Icon.arrow /> Send
        </button>
      </div>
      {error && (
        <div
          style={{
            maxWidth: 700,
            margin: "8px auto 0",
            color: C.crimson,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}