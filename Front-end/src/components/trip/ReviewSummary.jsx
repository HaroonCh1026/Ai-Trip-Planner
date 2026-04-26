import { useState } from "react";
import { C } from "../../styles/colors";
import { Icon } from "../Icon";
import { CHATBOT_QUESTIONS } from "../../constants/data";
import { findCity, formatBudgetHint } from "../../constants/pakistanCities";

/**
 * Final review screen — shown after the user has answered all chatbot
 * questions, before we hit the AI. Lets them edit any answer inline before
 * confirming. This prevents the "oops I typed wrong city" frustration that
 * required them to start over before.
 *
 * Each answer renders as a row with a label, the value, and an Edit button.
 * Clicking Edit swaps the row to an inline input/select. Save commits the
 * change back to the parent's `answers` state.
 */
export default function ReviewSummary({ answers, onConfirm, onEditField, onCancel }) {
  // Track which field is currently being edited (id, or null)
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");

  const startEdit = (id, currentValue) => {
    setEditing(id);
    setDraft(currentValue || "");
  };

  const saveEdit = (id) => {
    const trimmed = draft.trim();
    if (!trimmed) return; // don't allow empty values
    onEditField(id, trimmed);
    setEditing(null);
    setDraft("");
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft("");
  };

  // Budget hint based on destination (if it matches a known city)
  const destCity = findCity(answers.destination || "");
  const budgetHint = destCity ? formatBudgetHint(destCity) : null;

  return (
    <div className="anim-fadeIn" style={{ maxWidth: 700, margin: "0 auto", padding: "20px 0" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <p className="section-label" style={{ marginBottom: 6 }}>Final Review</p>
        <h2 className="display-heading" style={{ fontSize: 26, marginBottom: 8 }}>
          Confirm your trip details
        </h2>
        <p style={{ color: C.midGray, fontSize: 14 }}>
          Tap any field to edit before we generate your itinerary.
        </p>
      </div>

      {/* Trip details card */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        {CHATBOT_QUESTIONS.map((q, i) => {
          const value = answers[q.id] || "";
          const isLast = i === CHATBOT_QUESTIONS.length - 1;
          const isEditing = editing === q.id;
          return (
            <div
              key={q.id}
              style={{
                padding: "18px 20px",
                borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.midGray, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                    {q.label || q.id}
                  </div>

                  {isEditing ? (
                    <input
                      type={q.type === "number" ? "number" : q.type === "date" ? "date" : "text"}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(q.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      placeholder={q.placeholder}
                      autoFocus
                      style={{ width: "100%", fontSize: 15 }}
                      aria-label={`Edit ${q.label || q.id}`}
                    />
                  ) : (
                    <div style={{ fontSize: 15, color: C.offWhite, fontWeight: 500, wordBreak: "break-word" }}>
                      {q.id === "budget" && value ? `PKR ${Number(value).toLocaleString()}` : value || <span style={{ color: C.midGray, fontStyle: "italic" }}>not set</span>}
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => saveEdit(q.id)}
                      aria-label="Save edit"
                      style={{ padding: "6px 12px", background: C.crimson, border: "none", borderRadius: 4, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      aria-label="Cancel edit"
                      style={{ padding: "6px 12px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: C.midGray, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(q.id, value)}
                    aria-label={`Edit ${q.label || q.id}`}
                    style={{ padding: "6px 12px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: C.midGray, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.crimson; e.currentTarget.style.color = C.offWhite; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = C.midGray; }}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Budget hint card — shown only if we recognize the destination */}
      {budgetHint && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(0,180,140,0.08)",
            border: "1px solid rgba(0,180,140,0.3)",
            borderRadius: 8,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            color: C.offWhite,
          }}
        >
          <span style={{ fontSize: 16 }}>💡</span>
          <span>{budgetHint}</span>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          aria-label="Go back to chat"
          style={{
            padding: "12px 20px",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 6,
            color: C.midGray,
            cursor: "pointer",
            fontSize: 14,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          ← Back to chat
        </button>
        <button
          className="btn-primary"
          onClick={onConfirm}
          aria-label="Confirm and generate itinerary"
          style={{ padding: "12px 24px", fontSize: 14 }}
        >
          <Icon.sparkle /> Generate Itinerary
        </button>
      </div>
    </div>
  );
}