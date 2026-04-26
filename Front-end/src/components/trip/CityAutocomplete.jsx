import { useState, useEffect, useRef } from "react";
import { C } from "../../styles/colors";
import { searchCities } from "../../constants/pakistanCities";

/**
 * Autocomplete input for Pakistani cities & destinations.
 *
 * Supports two interaction patterns simultaneously:
 *
 *   1. **Dropdown list** — click any suggestion, or use ArrowUp/ArrowDown
 *      + Enter to pick one with the keyboard.
 *
 *   2. **Tab-to-accept ghost** — when the user has typed a prefix that
 *      matches the start of an existing city name, the rest of that name
 *      appears as faded "ghost" text beside their typing. Pressing Tab
 *      (or ArrowRight at end-of-input) accepts the ghost and fills it in.
 *      Inspired by Gmail's compose-suggest and IDE autocomplete.
 *
 * The user can still free-type anything not in the list — autocomplete is
 * a discoverability aid, not a constraint.
 */
export default function CityAutocomplete({
  value,
  onChange,
  onSubmit,
  placeholder,
  autoFocus,
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [ghostDismissed, setGhostDismissed] = useState(false); // if user pressed Escape, hide ghost until they edit
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // Suggestions for the dropdown. Limit to 8.
  const suggestions = open && value ? searchCities(value, 8) : [];

  // ── Compute the ghost suggestion ──────────────────────────────────────
  // Ghost only renders when:
  //   - user has typed something
  //   - the first suggestion starts with the typed text (case-insensitive)
  //   - the typed text isn't already the full match
  //   - the user hasn't dismissed the ghost via Escape
  // We expose only the *remainder* of the suggestion to render after the
  // user's input.
  const ghost = (() => {
    if (ghostDismissed || !value) return null;
    const trimmed = value;
    const matches = searchCities(trimmed, 1);
    const top = matches[0];
    if (!top) return null;
    const lowerTop = top.name.toLowerCase();
    const lowerInput = trimmed.toLowerCase();
    if (!lowerTop.startsWith(lowerInput)) return null;
    if (lowerTop === lowerInput) return null; // exact match, nothing to ghost
    return {
      remainder: top.name.slice(trimmed.length),
      fullName: top.name,
    };
  })();

  // Reset highlight whenever suggestion list changes
  useEffect(() => {
    setHighlighted(-1);
  }, [value]);

  // Reset dismissed-ghost flag when user edits the input — they may want
  // suggestions back after they've typed more.
  // We do this implicitly by clearing on any onChange below.

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Keyboard handlers ──────────────────────────────────────────────────
  const acceptGhost = () => {
    if (!ghost) return false;
    onChange(ghost.fullName);
    setOpen(false);
    setHighlighted(-1);
    return true;
  };

  const handleKeyDown = (e) => {
    // Tab: accept the ghost if there is one. Don't capture Tab when there's
    // no ghost — let it do its normal browser thing (move focus).
    if (e.key === "Tab" && ghost) {
      e.preventDefault();
      acceptGhost();
      return;
    }

    // ArrowRight at end-of-input also accepts the ghost — common alt-binding
    // because Tab is sometimes ambiguous with form navigation expectations.
    if (
      e.key === "ArrowRight" &&
      ghost &&
      inputRef.current &&
      inputRef.current.selectionStart === value.length
    ) {
      e.preventDefault();
      acceptGhost();
      return;
    }

    if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
      return;
    }

    if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, -1));
      return;
    }

    if (e.key === "Enter") {
      if (highlighted >= 0 && suggestions[highlighted]) {
        // User picked from dropdown with keyboard
        onChange(suggestions[highlighted].name);
        setOpen(false);
        setHighlighted(-1);
        e.preventDefault();
      } else {
        // Plain Enter: submit whatever's typed (don't auto-accept ghost on
        // Enter — it would surprise users who didn't realize a ghost was there)
        setOpen(false);
        onSubmit();
      }
      return;
    }

    if (e.key === "Escape") {
      // Dismiss ghost AND close dropdown. User edits clear the dismissed flag.
      setOpen(false);
      setHighlighted(-1);
      setGhostDismissed(true);
      return;
    }
  };

  const pickSuggestion = (city) => {
    onChange(city.name);
    setOpen(false);
    setHighlighted(-1);
    setGhostDismissed(false);
  };

  return (
    <div ref={wrapRef} style={{ flex: 1, position: "relative" }}>
      {/* The input + ghost overlay are stacked. The visible input is the real
          element; the ghost is rendered absolutely-positioned ON TOP of it
          but BEHIND the user's typed text using z-index. We use the same
          font and padding as the input so character widths align. */}
      <div style={{ position: "relative", width: "100%" }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setGhostDismissed(false); // re-enable ghost after user typed
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          aria-label="City or destination"
          aria-autocomplete="list"
          aria-expanded={open && suggestions.length > 0}
          style={{ width: "100%", fontSize: 15, position: "relative", background: "transparent", zIndex: 2 }}
        />

        {/* Ghost rendering: a faded version of "value + remainder" sitting
            beneath the input. The user's typed portion in the ghost layer is
            transparent so it doesn't double-render — only the remainder is
            visually shown, in muted gray. */}
        {ghost && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              padding: "12px 14px", // must match your global input padding
              fontSize: 15,
              fontFamily: "inherit",
              color: "transparent",
              pointerEvents: "none",
              whiteSpace: "pre",
              overflow: "hidden",
              zIndex: 1,
              lineHeight: 1.4,
            }}
          >
            {/* Render the typed text as transparent so widths line up, then
                append the remainder in faded color. */}
            <span style={{ color: "transparent" }}>{value}</span>
            <span style={{ color: "rgba(255,255,255,0.28)" }}>{ghost.remainder}</span>
          </div>
        )}
      </div>

      {/* Tab hint — small inline label only when ghost is active.
          Helps first-time users discover the keyboard shortcut. */}
      {ghost && (
        <div
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 10,
            color: C.midGray,
            pointerEvents: "none",
            background: "rgba(20,20,20,0.6)",
            padding: "3px 7px",
            borderRadius: 3,
            border: "1px solid rgba(255,255,255,0.06)",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontFamily: "'DM Mono', monospace",
            zIndex: 3,
          }}
        >
          Tab ↹
        </div>
      )}

      {/* Dropdown list */}
      {open && suggestions.length > 0 && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% + 4px)",
            background: "rgba(20,20,20,0.98)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            maxHeight: 280,
            overflowY: "auto",
            zIndex: 100,
          }}
        >
          {suggestions.map((c, i) => (
            <button
              key={c.name}
              role="option"
              aria-selected={i === highlighted}
              onClick={() => pickSuggestion(c)}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                padding: "10px 14px",
                background: i === highlighted ? "rgba(140,50,50,0.18)" : "transparent",
                border: "none",
                borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                color: C.offWhite,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                transition: "background 0.1s",
              }}
            >
              <span style={{ fontWeight: 500 }}>{c.name}</span>
              <span style={{ fontSize: 11, color: C.midGray, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {c.region}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}