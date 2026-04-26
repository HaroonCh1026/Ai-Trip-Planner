import { useState } from "react";
import { C } from "../../styles/colors";
import { Icon } from "../../components/Icon";
import api from "../../api/client";

const BLANK = { title: "", excerpt: "", content: "", image: "", category: "Travel Tips", author: "VoyageurAI Team", readTime: "5 min read", published: true };
const CATS = ["Travel Tips", "Destination Guide", "Food & Culture", "Adventure", "Budget Travel", "Itinerary Ideas"];

export default function AdminBlogs({ blogs, setBlogs }) {
  const [view, setView]       = useState("list");   // "list" | "form"
  const [editing, setEditing] = useState(null);     // null = new, obj = edit
  const [form, setForm]       = useState(BLANK);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch]   = useState("");

  const filtered = blogs.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.category.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setEditing(null); setForm(BLANK); setView("form"); };
  const openEdit = (blog) => { setEditing(blog); setForm({ title: blog.title, excerpt: blog.excerpt, content: blog.content, image: blog.image, category: blog.category, author: blog.author, readTime: blog.readTime, published: blog.published }); setView("form"); };

  const handleSave = async () => {
    if (!form.title.trim() || !form.excerpt.trim() || !form.content.trim()) {
      alert("Title, excerpt and content are required."); return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { data } = await api.patch(`/admin/blogs/${editing._id}`, form);
        setBlogs(p => p.map(b => b._id === editing._id ? data.data.blog : b));
      } else {
        const { data } = await api.post("/admin/blogs", form);
        setBlogs(p => [data.data.blog, ...p]);
      }
      setView("list");
    } catch (err) { alert(err.response?.data?.message || "Save failed."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this blog post?")) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/blogs/${id}`);
      setBlogs(p => p.filter(b => b._id !== id));
    } catch (err) { alert(err.response?.data?.message || "Delete failed."); }
    finally { setDeleting(null); }
  };

  const togglePublish = async (blog) => {
    try {
      const { data } = await api.patch(`/admin/blogs/${blog._id}`, { published: !blog.published });
      setBlogs(p => p.map(b => b._id === blog._id ? data.data.blog : b));
    } catch (err) { alert("Failed to update status."); }
  };

  if (view === "form") return (
    <div className="anim-fadeIn">
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <button onClick={() => setView("list")} style={{ background: "transparent", border: "none", color: C.midGray, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
          <Icon.arrowLeft width="16" height="16" /> Back
        </button>
        <div>
          <p className="section-label">Blog Management</p>
          <h2 className="display-heading" style={{ fontSize: 28 }}>{editing ? "Edit Blog Post" : "New Blog Post"}</h2>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, marginBottom: 20 }}>Content</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div><label style={{ fontSize: 12, color: C.midGray, display: "block", marginBottom: 6 }}>Title *</label><input value={form.title} onChange={(e) => setForm(f=>({...f,title:e.target.value}))} placeholder="An engaging blog title..." /></div>
              <div><label style={{ fontSize: 12, color: C.midGray, display: "block", marginBottom: 6 }}>Excerpt * (shown on card)</label><textarea value={form.excerpt} onChange={(e) => setForm(f=>({...f,excerpt:e.target.value}))} placeholder="A brief 1-2 sentence summary..." style={{ minHeight: 80, resize: "vertical" }} /></div>
              <div><label style={{ fontSize: 12, color: C.midGray, display: "block", marginBottom: 6 }}>Full Content *</label><textarea value={form.content} onChange={(e) => setForm(f=>({...f,content:e.target.value}))} placeholder="Write the full blog post here..." style={{ minHeight: 300, resize: "vertical" }} /></div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, marginBottom: 16 }}>Settings</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={{ fontSize: 12, color: C.midGray, display: "block", marginBottom: 6 }}>Image URL</label><input value={form.image} onChange={(e) => setForm(f=>({...f,image:e.target.value}))} placeholder="https://..." /></div>
              {form.image && <img src={form.image} alt="preview" onError={(e) => (e.target.style.display="none")} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 6 }} />}
              <div>
                <label style={{ fontSize: 12, color: C.midGray, display: "block", marginBottom: 6 }}>Category</label>
                <select value={form.category} onChange={(e) => setForm(f=>({...f,category:e.target.value}))} style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: C.offWhite, fontFamily: "'DM Sans', sans-serif" }}>
                  {CATS.map(c => <option key={c} value={c} style={{ background: "#1a1a1a" }}>{c}</option>)}
                </select>
              </div>
              <div><label style={{ fontSize: 12, color: C.midGray, display: "block", marginBottom: 6 }}>Author</label><input value={form.author} onChange={(e) => setForm(f=>({...f,author:e.target.value}))} /></div>
              <div><label style={{ fontSize: 12, color: C.midGray, display: "block", marginBottom: 6 }}>Read Time</label><input value={form.readTime} onChange={(e) => setForm(f=>({...f,readTime:e.target.value}))} placeholder="5 min read" /></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div><div style={{ fontSize: 14, fontWeight: 500 }}>Published</div><div style={{ fontSize: 12, color: C.midGray, marginTop: 2 }}>Visible on landing page</div></div>
                <div onClick={() => setForm(f=>({...f,published:!f.published}))} style={{ width: 44, height: 24, borderRadius: 12, background: form.published ? C.crimson : "rgba(255,255,255,0.15)", cursor: "pointer", position: "relative", transition: "background 0.25s" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: form.published ? 23 : 3, transition: "left 0.25s" }} />
                </div>
              </div>
            </div>
          </div>
          <button className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: 14 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editing ? "Update Post" : "Publish Post"}
          </button>
          <button onClick={() => setView("list")} style={{ width: "100%", padding: 12, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: C.midGray, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 14 }}>Cancel</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="anim-fadeIn">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <p className="section-label">Content Management</p>
          <h2 className="display-heading" style={{ fontSize: 28 }}>Blog Posts ({blogs.length})</h2>
        </div>
        <button className="btn-primary" onClick={openNew}><Icon.plus /> New Post</button>
      </div>
      <div style={{ marginBottom: 20 }}>
        <input placeholder="Search blog posts..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: "60px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📝</div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, marginBottom: 8 }}>No blog posts yet</h3>
          <p style={{ color: C.midGray, fontSize: 14, marginBottom: 20 }}>Create your first travel blog post to display on the landing page.</p>
          <button className="btn-primary" onClick={openNew}><Icon.plus /> Create First Post</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
          {filtered.map((blog) => (
            <div key={blog._id} className="card" style={{ overflow: "hidden" }}>
              <div style={{ height: 160, position: "relative", overflow: "hidden" }}>
                <img src={blog.image || "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Hunza_Valley_Pakistan.jpg/800px-Hunza_Valley_Pakistan.jpg"} alt={blog.title}
                  onError={(e) => { e.target.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Hunza_Valley_Pakistan.jpg/800px-Hunza_Valley_Pakistan.jpg"; }}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)" }} />
                <div style={{ position: "absolute", top: 12, right: 12 }}>
                  <span style={{ background: blog.published ? "rgba(50,180,50,0.85)" : "rgba(100,100,100,0.85)", padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                    {blog.published ? "Published" : "Draft"}
                  </span>
                </div>
                <div style={{ position: "absolute", bottom: 12, left: 14 }}>
                  <span style={{ background: "rgba(140,50,50,0.9)", padding: "3px 10px", borderRadius: 4, fontSize: 11 }}>{blog.category}</span>
                </div>
              </div>
              <div style={{ padding: 20 }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, marginBottom: 8, lineHeight: 1.3 }}>{blog.title}</h3>
                <p style={{ fontSize: 13, color: C.midGray, lineHeight: 1.6, marginBottom: 16, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{blog.excerpt}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: C.midGray }}>{blog.readTime} · {blog.author}</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => togglePublish(blog)} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${blog.published ? "rgba(255,255,255,0.1)" : C.crimson}`, borderRadius: 4, color: blog.published ? C.midGray : C.crimson, cursor: "pointer", fontSize: 12 }}>
                      {blog.published ? "Unpublish" : "Publish"}
                    </button>
                    <button onClick={() => openEdit(blog)} style={{ padding: "6px 12px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: C.midGray, cursor: "pointer", fontSize: 12 }}>Edit</button>
                    <button onClick={() => handleDelete(blog._id)} disabled={deleting === blog._id} style={{ padding: "6px 12px", background: "transparent", border: "1px solid rgba(200,50,50,0.3)", borderRadius: 4, color: "#FF6B6B", cursor: "pointer", fontSize: 12 }}>
                      {deleting === blog._id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
