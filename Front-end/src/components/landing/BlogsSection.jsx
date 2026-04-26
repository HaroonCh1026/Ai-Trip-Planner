import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { C } from "../../styles/colors";
import { Icon } from "../Icon";
import api from "../../api/client";
import { BLOGS as STATIC_BLOGS } from "../../constants/data";

export default function BlogsSection() {
  const [blogs, setBlogs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/blogs")
      .then(({ data }) => {
        if (data.data?.blogs?.length > 0) setBlogs(data.data.blogs);
        else setBlogs(STATIC_BLOGS);
      })
      .catch(() => setBlogs(STATIC_BLOGS));
  }, []);

  const displayed = blogs.slice(0, 3);

  return (
    <section id="blogs" style={{ padding: "100px 5%", background: C.nearBlack }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div className="section-label">Field Intelligence</div>
          <h2 className="display-heading" style={{ fontSize: "clamp(32px, 5vw, 48px)" }}>Travel Insights & Briefs</h2>
        </div>
        {displayed.length === 0 ? (
          <div style={{ textAlign: "center", color: C.midGray, padding: 40 }}>No blogs published yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32 }}>
            {displayed.map((blog) => (
              <BlogCard key={blog._id || blog.id} blog={blog} onRead={() => navigate(`/blog/${blog._id || blog.id}`)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const BlogCard = ({ blog, onRead }) => (
  <div className="card hover-lift" style={{ overflow: "hidden", cursor: "pointer" }} onClick={onRead}>
    <div style={{ height: 220, position: "relative", overflow: "hidden" }}>
      <img src={blog.image} alt={blog.title}
        onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1519955266818-0231b63cd0d8?auto=format&fit=crop&w=800&q=80"; }}
        style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s ease" }}
        onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
        onMouseLeave={(e) => (e.target.style.transform = "scale(1)")} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,13,13,0.7) 0%, transparent 60%)" }} />
      <div style={{ position: "absolute", top: 16, left: 16, background: "rgba(140,50,50,0.9)", padding: "4px 12px", borderRadius: 4, fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.05em" }}>
        {(blog.category || "TRAVEL").toUpperCase()}
      </div>
      {blog.readTime && (
        <div style={{ position: "absolute", top: 16, right: 16, background: "rgba(13,13,13,0.8)", padding: "4px 10px", borderRadius: 4, fontSize: 11, color: C.midGray }}>
          {blog.readTime}
        </div>
      )}
    </div>
    <div style={{ padding: "24px" }}>
      <div style={{ fontSize: 12, color: C.midGray, marginBottom: 10 }}>
        {blog.date || (blog.createdAt && new Date(blog.createdAt).toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" }))}
      </div>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, marginBottom: 10, lineHeight: 1.3 }}>{blog.title}</h3>
      <p style={{ color: C.midGray, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>{blog.excerpt}</p>
      <button
        onClick={(e) => { e.stopPropagation(); onRead(); }}
        style={{ background: "transparent", border: "none", color: C.crimson, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0, fontFamily: "'DM Sans', sans-serif" }}
      >
        Read Brief <Icon.arrow />
      </button>
    </div>
  </div>
);