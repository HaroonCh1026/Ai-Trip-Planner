import { useState, useMemo, useEffect } from "react";
import { C } from "../../styles/colors";
import { Icon } from "../Icon";
import { CHATBOT_QUESTIONS } from "../../constants/data";
import {
  PAKISTAN_CITIES,
  findCity,
  formatBudgetHint,
} from "../../constants/pakistanCities";

/**
 * ChoicePicker — refined editorial GUI for the chatbot.
 *
 * Static design — no transitions, no transforms. Visual hierarchy comes from
 * spacing, color tinting, and typography, not motion.
 *
 * Submit contract is identical to the previous version: each sub-picker
 * calls onSubmit(stringValue), TripCreator.handleSend writes that string
 * into `answers[questionId]`, and the rest of the app keeps working.
 */
export default function ChoicePicker({
  onSend,
  onBack,
  error,
  currentQ,
  answers,
  generating,
}) {
  if (generating) return null;
  if (currentQ >= CHATBOT_QUESTIONS.length) return null;

  const currentQuestion = CHATBOT_QUESTIONS[currentQ];
  if (currentQuestion?.type === "special") return null;

  const stepNumber = currentQ + 1;
  const totalSteps = CHATBOT_QUESTIONS.length;

  const renderPicker = () => {
    switch (currentQuestion.id) {
      case "origin":
      case "destination":
        return (
          <CityPicker
            key={currentQuestion.id}
            initial={answers[currentQuestion.id] || ""}
            showBudgetHint={currentQuestion.id === "destination"}
            onSubmit={onSend}
          />
        );
      case "days":
        return (
          <DaysPicker
            key="days"
            initial={answers.days || ""}
            onSubmit={onSend}
          />
        );
      case "startDate":
        return (
          <DatePicker
            key="startDate"
            initial={answers.startDate || ""}
            onSubmit={onSend}
          />
        );
      case "budget":
        return (
          <BudgetPicker
            key="budget"
            initial={answers.budget || ""}
            onSubmit={onSend}
          />
        );
      case "preferences":
        return (
          <PreferencePicker
            key="preferences"
            initial={answers.preferences || ""}
            onSubmit={onSend}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        padding: "20px 5% 24px",
        background: "rgba(13,13,13,0.96)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Step header — small, editorial, gives users orientation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span
              style={{
                fontSize: 10,
                color: C.crimson,
                letterSpacing: "0.18em",
                fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              STEP {String(stepNumber).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
            </span>
            <span
              style={{
                fontSize: 13,
                color: C.offWhite,
                fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {currentQuestion.label}
            </span>
          </div>

          {currentQ > 0 && (
            <button
              onClick={onBack}
              aria-label="Go back to previous question"
              style={ghostBtn()}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = C.offWhite;
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = C.midGray;
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              }}
            >
              ← Back
            </button>
          )}
        </div>

        {/* Error bar */}
        {error && (
          <div
            role="alert"
            style={{
              marginBottom: 12,
              padding: "10px 14px",
              background: "rgba(140,50,50,0.08)",
              border: `1px solid ${C.crimson}`,
              borderRadius: 8,
              color: C.crimson,
              fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {error}
          </div>
        )}

        {renderPicker()}
      </div>
    </div>
  );
}

// ── Shared style helpers ────────────────────────────────────────────────
const chip = (active, opts = {}) => ({
  padding: opts.compact ? "7px 13px" : "9px 16px",
  background: active ? C.crimson : "rgba(255,255,255,0.025)",
  border: `1px solid ${active ? C.crimson : "rgba(255,255,255,0.09)"}`,
  borderRadius: 999,
  color: active ? "#fff" : C.offWhite,
  fontSize: opts.compact ? 12 : 13,
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: active ? 600 : 400,
  cursor: "pointer",
  outline: "none",
});

const continueBtn = (enabled) => ({
  padding: "11px 22px",
  fontSize: 13,
  opacity: enabled ? 1 : 0.4,
  cursor: enabled ? "pointer" : "not-allowed",
  background: enabled ? undefined : "rgba(255,255,255,0.05)",
  border: enabled ? undefined : "1px solid rgba(255,255,255,0.1)",
  color: enabled ? undefined : C.midGray,
  borderRadius: 8,
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 500,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
});

const ghostBtn = () => ({
  padding: "5px 11px",
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6,
  color: C.midGray,
  cursor: "pointer",
  fontSize: 11,
  fontFamily: "'DM Sans', sans-serif",
  letterSpacing: "0.04em",
});

const sectionLabel = () => ({
  fontSize: 10,
  color: C.midGray,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  fontWeight: 600,
  fontFamily: "'DM Sans', sans-serif",
  marginBottom: 8,
});

const submitRow = (left, right) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    }}
  >
    <span style={{ fontSize: 12, color: C.midGray, fontFamily: "'DM Sans', sans-serif" }}>
      {left}
    </span>
    {right}
  </div>
);

// ── 1. CityPicker ────────────────────────────────────────────────────────
function CityPicker({ initial, showBudgetHint, onSubmit }) {
  const REGION_ORDER = [
    "Federal",
    "Punjab",
    "Sindh",
    "KPK",
    "Balochistan",
    "Gilgit-Baltistan",
    "AJK",
  ];

  const [selected, setSelected] = useState(initial || "");
  const [search, setSearch] = useState("");
  const [activeRegion, setActiveRegion] = useState("All");

  // Build region tabs from the actual data so we never show an empty tab
  const availableRegions = useMemo(() => {
    const set = new Set();
    PAKISTAN_CITIES.forEach((c) => set.add(c.region || "Other"));
    return [
      "All",
      ...REGION_ORDER.filter((r) => set.has(r)),
      ...[...set].filter((r) => !REGION_ORDER.includes(r)),
    ];
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PAKISTAN_CITIES.filter((c) => {
      const matchRegion = activeRegion === "All" || c.region === activeRegion;
      const matchSearch = !q || c.name.toLowerCase().includes(q);
      return matchRegion && matchSearch;
    });
  }, [search, activeRegion]);

  const budgetHint = useMemo(() => {
    if (!showBudgetHint || !selected) return null;
    const city = findCity(selected);
    return city ? formatBudgetHint(city) : null;
  }, [selected, showBudgetHint]);

  const canSubmit = !!selected;

  return (
    <div>
      {/* Search */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cities…"
          aria-label="Filter cities"
          style={{
            width: "100%",
            fontSize: 14,
            padding: "11px 14px 11px 38px",
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            color: C.offWhite,
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 14,
            color: C.midGray,
            pointerEvents: "none",
          }}
        >
          🔍
        </span>
      </div>

      {/* Region tabs — horizontal scroll on narrow screens */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 12,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {availableRegions.map((r) => {
          const active = activeRegion === r;
          return (
            <button
              key={r}
              onClick={() => setActiveRegion(r)}
              aria-pressed={active}
              style={{
                padding: "6px 12px",
                background: active ? "rgba(140,50,50,0.18)" : "transparent",
                border: `1px solid ${active ? C.crimson : "rgba(255,255,255,0.08)"}`,
                borderRadius: 6,
                color: active ? C.offWhite : C.midGray,
                fontSize: 11,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                letterSpacing: "0.04em",
              }}
            >
              {r}
            </button>
          );
        })}
      </div>

      {/* City chip grid */}
      <div
        style={{
          maxHeight: 220,
          overflowY: "auto",
          padding: "12px",
          marginBottom: 12,
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: 12, color: C.midGray, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            No cities match your search.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {filtered.map((c) => {
              const active = selected === c.name;
              return (
                <button
                  key={c.name}
                  onClick={() => setSelected(c.name)}
                  aria-pressed={active}
                  style={chip(active, { compact: true })}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Budget hint */}
      {budgetHint && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            background: "rgba(0,180,140,0.06)",
            border: "1px solid rgba(0,180,140,0.25)",
            borderLeft: "3px solid rgb(0,180,140)",
            borderRadius: 6,
            fontSize: 12,
            color: C.offWhite,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <span aria-hidden="true">💡</span>
          <span>{budgetHint}</span>
        </div>
      )}

      {submitRow(
        selected ? (
          <span>
            Selected: <span style={{ color: C.offWhite, fontWeight: 600 }}>{selected}</span>
          </span>
        ) : (
          "Tap a city to continue"
        ),
        <button
          className={canSubmit ? "btn-primary" : ""}
          onClick={() => canSubmit && onSubmit(selected)}
          disabled={!canSubmit}
          style={continueBtn(canSubmit)}
        >
          <Icon.arrow /> Continue
        </button>
      )}
    </div>
  );
}

// ── 2. DaysPicker ────────────────────────────────────────────────────────
function DaysPicker({ initial, onSubmit }) {
  const PRESETS = [3, 5, 7, 10, 14];
  const initialNum = parseInt(initial, 10);
  const [days, setDays] = useState(
    Number.isFinite(initialNum) && initialNum >= 1 && initialNum <= 30
      ? initialNum
      : 5,
  );

  return (
    <div>
      {/* Hero number — confident, large, the visual anchor of this step */}
      <div
        style={{
          padding: "20px 18px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <div>
          <p style={sectionLabel()}>Trip length</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: C.offWhite,
                fontFamily: "'DM Sans', sans-serif",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {days}
            </span>
            <span style={{ fontSize: 14, color: C.midGray, fontFamily: "'DM Sans', sans-serif" }}>
              day{days === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setDays((d) => Math.max(1, d - 1))}
            aria-label="Decrease days"
            style={stepperBtn()}
          >
            −
          </button>
          <button
            onClick={() => setDays((d) => Math.min(30, d + 1))}
            aria-label="Increase days"
            style={stepperBtn()}
          >
            +
          </button>
        </div>
      </div>

      {/* Presets */}
      <p style={sectionLabel()}>Quick pick</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setDays(p)}
            aria-pressed={days === p}
            style={chip(days === p)}
          >
            {p} days
          </button>
        ))}
      </div>

      {submitRow(
        <span>Range: 1 – 30 days</span>,
        <button
          className="btn-primary"
          onClick={() => onSubmit(String(days))}
          style={continueBtn(true)}
        >
          <Icon.arrow /> Continue
        </button>
      )}
    </div>
  );
}

const stepperBtn = () => ({
  width: 42,
  height: 42,
  background: "transparent",
  border: `1px solid ${C.crimson}`,
  borderRadius: 8,
  color: C.offWhite,
  fontSize: 20,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
});

// ── 3. DatePicker ────────────────────────────────────────────────────────
function DatePicker({ initial, onSubmit }) {
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const offsetDays = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const nextWeekendISO = () => {
    const d = new Date();
    const dow = d.getDay();
    const offset = dow === 6 ? 7 : (6 - dow + 7) % 7 || 7;
    return offsetDays(offset);
  };

  const PRESETS = [
    { id: "weekend", label: "This weekend", value: nextWeekendISO() },
    { id: "two_weeks", label: "In 2 weeks", value: offsetDays(14) },
    { id: "next_month", label: "Next month", value: offsetDays(30) },
  ];

  const initialDefault =
    initial && /^\d{4}-\d{2}-\d{2}$/.test(initial) ? initial : offsetDays(14);
  const [date, setDate] = useState(initialDefault);

  const matchedPreset = PRESETS.find((p) => p.value === date)?.id || null;
  const today = todayISO();

  const friendly = useMemo(() => {
    if (!date) return "";
    try {
      return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return date;
    }
  }, [date]);

  const canSubmit = !!date && date >= today;

  return (
    <div>
      {/* Hero date display */}
      <div
        style={{
          padding: "18px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          marginBottom: 14,
        }}
      >
        <p style={sectionLabel()}>Departing</p>
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: C.offWhite,
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 12,
            letterSpacing: "-0.01em",
          }}
        >
          {canSubmit ? friendly : "Pick a future date"}
        </div>
        <input
          type="date"
          value={date}
          min={today}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Departure date"
          style={{
            width: "100%",
            fontSize: 14,
            padding: "10px 14px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            color: C.offWhite,
            fontFamily: "'DM Sans', sans-serif",
            colorScheme: "dark",
          }}
        />
      </div>

      <p style={sectionLabel()}>Quick pick</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setDate(p.value)}
            aria-pressed={matchedPreset === p.id}
            style={chip(matchedPreset === p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {submitRow(
        canSubmit ? "Date confirmed" : "Pick a future date",
        <button
          className={canSubmit ? "btn-primary" : ""}
          onClick={() => canSubmit && onSubmit(date)}
          disabled={!canSubmit}
          style={continueBtn(canSubmit)}
        >
          <Icon.arrow /> Continue
        </button>
      )}
    </div>
  );
}

// ── 4. BudgetPicker ──────────────────────────────────────────────────────
function BudgetPicker({ initial, onSubmit }) {
  const PRESETS = [
    { v: 50000, label: "50K" },
    { v: 100000, label: "100K" },
    { v: 150000, label: "150K" },
    { v: 250000, label: "250K" },
    { v: 500000, label: "500K" },
    { v: 1000000, label: "1M+" },
  ];

  const MIN = 20000;
  const MAX = 2000000;
  const STEP = 5000;

  const initialNum = parseInt(initial, 10);
  const [budget, setBudget] = useState(
    Number.isFinite(initialNum) && initialNum >= MIN ? initialNum : 100000,
  );

  const fmt = (n) => Number(n).toLocaleString();
  const matchedPreset = PRESETS.find((p) => p.v === budget)?.v || null;

  // Tier label — gives the user implicit feedback about what their budget means
  const tier = useMemo(() => {
    if (budget < 75000) return "Backpacker";
    if (budget < 200000) return "Comfortable";
    if (budget < 500000) return "Premium";
    return "Luxury";
  }, [budget]);

  return (
    <div>
      {/* Hero budget display */}
      <div
        style={{
          padding: "18px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <p style={{ ...sectionLabel(), marginBottom: 0 }}>Total budget</p>
          <span
            style={{
              fontSize: 10,
              padding: "3px 9px",
              background: "rgba(140,50,50,0.15)",
              border: `1px solid ${C.crimson}`,
              borderRadius: 999,
              color: C.offWhite,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {tier}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
          <span
            style={{
              fontSize: 13,
              color: C.midGray,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
            }}
          >
            PKR
          </span>
          <span
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: C.offWhite,
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {fmt(budget)}
          </span>
        </div>

        <input
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={budget}
          onChange={(e) => setBudget(parseInt(e.target.value, 10))}
          aria-label="Budget slider"
          style={{
            width: "100%",
            accentColor: C.crimson,
            cursor: "pointer",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: C.midGray,
            marginTop: 4,
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "0.04em",
          }}
        >
          <span>PKR {fmt(MIN)}</span>
          <span>PKR {fmt(MAX)}</span>
        </div>
      </div>

      <p style={sectionLabel()}>Quick pick</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {PRESETS.map((p) => (
          <button
            key={p.v}
            onClick={() => setBudget(p.v)}
            aria-pressed={matchedPreset === p.v}
            style={chip(matchedPreset === p.v)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {submitRow(
        <span>Adjust the slider for a custom amount</span>,
        <button
          className="btn-primary"
          onClick={() => onSubmit(String(budget))}
          style={continueBtn(true)}
        >
          <Icon.arrow /> Continue
        </button>
      )}
    </div>
  );
}

// ── 5. PreferencePicker ──────────────────────────────────────────────────
function PreferencePicker({ initial, onSubmit }) {
  const OPTIONS = [
    { id: "Food", icon: "🍜" },
    { id: "Mountains", icon: "🏔️" },
    { id: "Nature", icon: "🌿" },
    { id: "History", icon: "🏛️" },
    { id: "Culture", icon: "🎭" },
    { id: "Adventure", icon: "🧗" },
    { id: "Photography", icon: "📷" },
    { id: "Shopping", icon: "🛍️" },
    { id: "Religious", icon: "🕌" },
    { id: "Beach", icon: "🏖️" },
    { id: "Lakes", icon: "🏞️" },
    { id: "Wildlife", icon: "🦌" },
  ];

  const initialSet = useMemo(() => {
    if (!initial) return new Set();
    return new Set(
      initial
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }, [initial]);

  const [selected, setSelected] = useState(initialSet);

  useEffect(() => {
    setSelected(initialSet);
  }, [initialSet]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canSubmit = selected.size > 0;
  const joined = Array.from(selected).join(", ");

  return (
    <div>
      <div
        style={{
          padding: "14px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ ...sectionLabel(), marginBottom: 0 }}>Pick all that apply</p>
          <span
            style={{
              fontSize: 11,
              color: selected.size > 0 ? C.offWhite : C.midGray,
              fontFamily: "'DM Mono', monospace",
              fontWeight: 600,
            }}
          >
            {selected.size} / {OPTIONS.length}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))",
            gap: 8,
          }}
        >
          {OPTIONS.map((o) => {
            const active = selected.has(o.id);
            return (
              <button
                key={o.id}
                onClick={() => toggle(o.id)}
                aria-pressed={active}
                style={{
                  padding: "12px 10px",
                  background: active ? "rgba(140,50,50,0.18)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${active ? C.crimson : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 8,
                  color: active ? C.offWhite : C.offWhite,
                  fontSize: 12,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  position: "relative",
                  outline: "none",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 22, lineHeight: 1 }}>
                  {o.icon}
                </span>
                <span>{o.id}</span>
                {active && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: 5,
                      right: 6,
                      fontSize: 10,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: C.crimson,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {submitRow(
        canSubmit ? (
          <span>
            <span style={{ color: C.offWhite, fontWeight: 600 }}>{selected.size}</span> selected: {joined}
          </span>
        ) : (
          "Pick at least one interest"
        ),
        <button
          className={canSubmit ? "btn-primary" : ""}
          onClick={() => canSubmit && onSubmit(joined)}
          disabled={!canSubmit}
          style={continueBtn(canSubmit)}
        >
          <Icon.arrow /> Continue
        </button>
      )}
    </div>
  );
}