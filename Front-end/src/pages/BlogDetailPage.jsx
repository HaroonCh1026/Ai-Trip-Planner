import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { C } from "../styles/colors";
import { Icon } from "../components/Icon";
import api from "../api/client";

export default function BlogDetailPage({ onBack }) {
  const { id } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/blogs/${id}`)
      .then(({ data }) => setBlog(data.data.blog))
      .catch(() => setError("Blog not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.nearBlack }}>
      <div style={{ color: C.midGray, fontSize: 14 }}>Loading...</div>
    </div>
  );

  if (error || !blog) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.nearBlack, gap: 16 }}>
      <div style={{ fontSize: 40 }}>📰</div>
      <h2 style={{ fontFamily: "'Playfair Display', serif" }}>Blog not found</h2>
      <button className="btn-secondary" onClick={onBack}>← Go Back</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.nearBlack }}>
      {/* Hero */}
      <div style={{ position: "relative", height: 420, overflow: "hidden" }}>
        <img src={blog.image || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=80"}
          alt={blog.title} style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=80"; }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,13,13,0.95) 0%, rgba(13,13,13,0.4) 60%)" }} />
        <div style={{ position: "absolute", top: 24, left: "5%" }}>
          <button onClick={onBack} style={{ background: "rgba(13,13,13,0.7)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: C.offWhite, cursor: "pointer", padding: "8px 16px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 6, backdropFilter: "blur(8px)" }}>
            <Icon.arrowLeft width="16" height="16" /> Back
          </button>
        </div>
        <div style={{ position: "absolute", bottom: 48, left: "5%", right: "5%", maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
            <span style={{ background: "rgba(140,50,50,0.9)", padding: "4px 14px", borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>{blog.category.toUpperCase()}</span>
            <span style={{ color: C.midGray, fontSize: 13 }}>{blog.readTime}</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(24px, 4vw, 44px)", fontWeight: 700, lineHeight: 1.2, marginBottom: 12 }}>{blog.title}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, color: C.midGray }}>
            <span>By {blog.author}</span>
            <span>·</span>
            <span>{new Date(blog.createdAt).toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 5%" }}>
        <p style={{ fontSize: 18, color: "rgba(242,242,242,0.85)", lineHeight: 1.9, marginBottom: 40, fontStyle: "italic", borderLeft: `3px solid ${C.crimson}`, paddingLeft: 20 }}>{blog.excerpt}</p>
        <div style={{ fontSize: 15, color: "rgba(242,242,242,0.8)", lineHeight: 2, whiteSpace: "pre-wrap" }}>{blog.content}</div>
        <div style={{ marginTop: 64, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onBack} className="btn-secondary" style={{ fontSize: 13 }}>
            <Icon.arrowLeft width="16" height="16" /> Back to Home
          </button>
          <span style={{ fontSize: 12, color: C.midGray }}>VoyageurAI Travel Insights</span>
        </div>
      </div>
    </div>
  );
}
