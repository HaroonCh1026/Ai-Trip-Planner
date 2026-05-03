import { C } from "../../styles/colors";

/**
 * ConfirmModal — replaces native window.confirm() in admin pages.
 *
 * Usage:
 *   const [confirm, setConfirm] = useState(null);
 *   ...
 *   setConfirm({
 *     title: "Delete this blog post?",
 *     message: "This cannot be undone.",
 *     confirmLabel: "Delete",
 *     destructive: true,
 *     onConfirm: () => doDelete(),
 *   });
 *   ...
 *   <ConfirmModal confirm={confirm} onClose={() => setConfirm(null)} />
 *
 * Pattern: caller passes the action via `onConfirm`. Modal closes itself
 * after running it. Set `destructive: true` to color the action button red.
 */
export default function ConfirmModal({ confirm, onClose }) {
  if (!confirm) return null;

  const handleConfirm = () => {
    try {
      confirm.onConfirm?.();
    } finally {
      onClose?.();
    }
  };

  const buttonBg = confirm.destructive ? C.crimson : "rgba(168,119,212,0.9)";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9998,
        animation: "fade-in 0.15s ease",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1a1a",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          padding: 28,
          maxWidth: 420,
          width: "calc(100% - 48px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          animation: "modal-slide-in 0.2s ease-out",
        }}
      >
        <h3
          id="confirm-modal-title"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 20,
            color: C.offWhite,
            marginBottom: 8,
          }}
        >
          {confirm.title || "Are you sure?"}
        </h3>
        {confirm.message && (
          <p style={{ fontSize: 13, color: C.midGray, lineHeight: 1.5, marginBottom: 24 }}>
            {confirm.message}
          </p>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 18px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 6,
              color: C.offWhite,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {confirm.cancelLabel || "Cancel"}
          </button>
          <button
            onClick={handleConfirm}
            autoFocus
            style={{
              padding: "10px 18px",
              background: buttonBg,
              border: "none",
              borderRadius: 6,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {confirm.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modal-slide-in {
          from { transform: translateY(-12px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}