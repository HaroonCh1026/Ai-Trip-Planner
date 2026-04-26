import { useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import GenerationLoader from "./GenerationLoader";

export default function ChatList({ messages, generating, genSteps, genStep }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "32px 5%" }}>
      <div
        style={{
          maxWidth: 700,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {messages.map((msg, i) => (
          <ChatMessage key={i} msg={msg} />
        ))}

        {generating && (
          <GenerationLoader genSteps={genSteps} genStep={genStep} />
        )}
        
        <div ref={bottomRef} />
      </div>
    </div>
  );
}