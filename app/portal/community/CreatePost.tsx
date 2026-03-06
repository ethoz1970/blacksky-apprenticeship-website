"use client";

import { useState, useRef } from "react";

type Props = {
  myAvatar?: string | null;
  myFirstName: string;
  classId?: number | null;
  onPosted: (post: Post) => void;
};

type Post = {
  id: number;
  content: string;
  scope: string;
  date_created: string;
  author: { id: string; first_name: string; last_name?: string; avatar?: string | null };
  image?: { id: string; filename_download: string } | null;
  attachment?: { id: string; filename_download: string } | null;
  link_url?: string | null;
  link_title?: string | null;
  link_description?: string | null;
  link_image?: string | null;
};

type Mode = "text" | "image" | "file" | "link";

function Avatar({ avatarId, firstName, size = 36 }: { avatarId?: string | null; firstName: string; size?: number }) {
  if (avatarId) return (
    <img src={`/api/portal/files/${avatarId}?inline=1`} alt={firstName}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      backgroundColor: "rgba(123,97,255,0.2)", border: "1px solid rgba(123,97,255,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 14, fontWeight: 700, color: "#a590ff", flexShrink: 0,
    }}>
      {firstName?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function CreatePost({ myAvatar, myFirstName, classId, onPosted }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode]         = useState<Mode>("text");
  const [scope, setScope]       = useState<"global" | "class">("global");
  const [content, setContent]   = useState("");
  const [linkUrl, setLinkUrl]   = useState("");
  const [linkPreview, setLinkPreview] = useState<{ title?: string | null; description?: string | null; image?: string | null } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ id: string; filename_download: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting]   = useState(false);
  const [error, setError]       = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchLinkPreview(url: string) {
    if (!url.startsWith("http")) return;
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/portal/link-preview?url=${encodeURIComponent(url)}`);
      if (res.ok) setLinkPreview(await res.json());
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/portal/upload", { method: "POST", body: form });
    if (res.ok) {
      const json = await res.json();
      setUploadedFile(json.data);
    }
    setUploading(false);
  }

  async function submit() {
    if (!content.trim() && mode === "text") { setError("Write something first."); return; }
    setPosting(true); setError("");
    try {
      const body: Record<string, unknown> = { content, scope, class_id: scope === "class" ? classId : null };
      if (mode === "image" && uploadedFile) body.image = uploadedFile.id;
      if (mode === "file"  && uploadedFile) body.attachment = uploadedFile.id;
      if (mode === "link") {
        body.link_url         = linkUrl;
        body.link_title       = linkPreview?.title ?? null;
        body.link_description = linkPreview?.description ?? null;
        body.link_image       = linkPreview?.image ?? null;
      }
      const res = await fetch("/api/portal/community/posts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const { data } = await res.json();
      onPosted(data);
      setContent(""); setLinkUrl(""); setLinkPreview(null); setUploadedFile(null);
      setExpanded(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPosting(false);
    }
  }

  const btn = (m: Mode, label: string) => (
    <button onClick={() => { setMode(m); setUploadedFile(null); }} style={{
      padding: "5px 14px", borderRadius: "100px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
      border: mode === m ? "1px solid rgba(123,97,255,0.6)" : "1px solid rgba(123,97,255,0.2)",
      backgroundColor: mode === m ? "rgba(123,97,255,0.15)" : "transparent",
      color: mode === m ? "#c0b0ff" : "#7070a0",
    }}>
      {label}
    </button>
  );

  return (
    <div style={{
      backgroundColor: "rgba(26,26,46,0.7)", border: "1px solid rgba(123,97,255,0.15)",
      borderRadius: "12px", padding: "20px",
    }}>
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <Avatar avatarId={myAvatar} firstName={myFirstName} />
        <div style={{ flex: 1 }}>
          <textarea
            placeholder="Share something with the community…"
            value={content}
            onFocus={() => setExpanded(true)}
            onChange={e => setContent(e.target.value)}
            rows={expanded ? 3 : 1}
            style={{
              width: "100%", boxSizing: "border-box",
              backgroundColor: "rgba(123,97,255,0.06)",
              border: "1px solid rgba(123,97,255,0.15)", borderRadius: "8px",
              padding: "10px 14px", color: "#f0eeff", fontSize: "14px",
              resize: "none", outline: "none", fontFamily: "inherit",
              transition: "height 0.2s",
            }}
          />

          {expanded && (
            <div style={{ marginTop: "12px" }}>
              {/* Mode tabs */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                {btn("text", "✍ Text")}
                {btn("image", "🖼 Image")}
                {btn("file", "📎 File")}
                {btn("link", "🔗 Link")}
                {classId && (
                  <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
                    {(["global", "class"] as const).map(s => (
                      <button key={s} onClick={() => setScope(s)} style={{
                        padding: "5px 12px", borderRadius: "100px", fontSize: "11px", fontWeight: 600, cursor: "pointer",
                        border: scope === s ? "1px solid rgba(123,97,255,0.6)" : "1px solid rgba(123,97,255,0.15)",
                        backgroundColor: scope === s ? "rgba(123,97,255,0.12)" : "transparent",
                        color: scope === s ? "#c0b0ff" : "#606080",
                      }}>
                        {s === "global" ? "🌐 Global" : "🎓 My Class"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mode inputs */}
              {(mode === "image" || mode === "file") && (
                <div style={{ marginBottom: "12px" }}>
                  <input ref={fileRef} type="file" accept={mode === "image" ? "image/*" : "*"} onChange={handleFileUpload} style={{ display: "none" }} />
                  {uploadedFile ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", backgroundColor: "rgba(123,97,255,0.08)", borderRadius: "8px", border: "1px solid rgba(123,97,255,0.2)" }}>
                      <span style={{ fontSize: "13px", color: "#c0b0ff" }}>✓ {uploadedFile.filename_download}</span>
                      <button onClick={() => setUploadedFile(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#606080", cursor: "pointer", fontSize: "16px" }}>×</button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
                      padding: "10px 20px", borderRadius: "8px", border: "1px dashed rgba(123,97,255,0.3)",
                      backgroundColor: "transparent", color: "#7070a0", cursor: "pointer", fontSize: "13px",
                    }}>
                      {uploading ? "Uploading…" : `+ Choose ${mode === "image" ? "image" : "file"}`}
                    </button>
                  )}
                </div>
              )}

              {mode === "link" && (
                <div style={{ marginBottom: "12px" }}>
                  <input
                    type="url" placeholder="Paste a URL…"
                    value={linkUrl}
                    onChange={e => setLinkUrl(e.target.value)}
                    onBlur={() => fetchLinkPreview(linkUrl)}
                    style={{
                      width: "100%", boxSizing: "border-box", padding: "10px 14px",
                      backgroundColor: "rgba(123,97,255,0.06)", border: "1px solid rgba(123,97,255,0.2)",
                      borderRadius: "8px", color: "#f0eeff", fontSize: "14px", outline: "none",
                    }}
                  />
                  {previewLoading && <p style={{ fontSize: "12px", color: "#7070a0", marginTop: "8px" }}>Fetching preview…</p>}
                  {linkPreview?.title && (
                    <div style={{ marginTop: "10px", padding: "12px", backgroundColor: "rgba(123,97,255,0.06)", borderRadius: "8px", border: "1px solid rgba(123,97,255,0.15)" }}>
                      {linkPreview.image && <img src={linkPreview.image} alt="" style={{ width: "100%", borderRadius: "6px", marginBottom: "8px", maxHeight: "140px", objectFit: "cover" }} />}
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "#d0d0e8", margin: "0 0 4px" }}>{linkPreview.title}</p>
                      {linkPreview.description && <p style={{ fontSize: "12px", color: "#8080a0", margin: 0, lineHeight: 1.5 }}>{linkPreview.description.slice(0, 120)}</p>}
                    </div>
                  )}
                </div>
              )}

              {error && <p style={{ fontSize: "12px", color: "#ff9090", marginBottom: "10px" }}>{error}</p>}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button onClick={() => { setExpanded(false); setContent(""); setError(""); }} style={{
                  padding: "8px 16px", borderRadius: "6px", border: "1px solid rgba(123,97,255,0.2)",
                  background: "none", color: "#7070a0", cursor: "pointer", fontSize: "13px",
                }}>Cancel</button>
                <button onClick={submit} disabled={posting} style={{
                  padding: "8px 20px", borderRadius: "6px", border: "none",
                  backgroundColor: posting ? "rgba(123,97,255,0.4)" : "#7b61ff",
                  color: "white", fontWeight: 700, cursor: posting ? "not-allowed" : "pointer", fontSize: "13px",
                }}>
                  {posting ? "Posting…" : "Post"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
