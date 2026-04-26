import { C } from "../../styles/colors";
import { Icon } from "../Icon";

export default function ChatMessage({ msg }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: msg.from === "bot" ? "flex-start" : "flex-end",
        animation: "fadeUp 0.3s ease",
      }}
    >
      {msg.from === "bot" && (
        <div
          style={{
            width: 36,
            height: 36,
            background: C.crimson,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
            flexShrink: 0,
            alignSelf: "flex-end",
          }}
        >
          <Icon.sparkle />
        </div>
      )}
      <div
        style={{
          maxWidth: "75%",
          padding: "14px 18px",
          borderRadius:
            msg.from === "bot"
              ? "18px 18px 18px 4px"
              : "18px 18px 4px 18px",
          background: msg.from === "bot" ? C.darkGray : C.crimson,
          border:
            msg.from === "bot"
              ? "1px solid rgba(255,255,255,0.08)"
              : "none",
          fontSize: 14,
          lineHeight: 1.75,
          whiteSpace: "pre-line",
        }}
      >
        {msg.text}
      </div>
    </div>
  );
}