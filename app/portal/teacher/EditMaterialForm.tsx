"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const materialTypes = [
  { value: "document", label: "Document", color: "#7b61ff" },
  { value: "reading",  label: "Reading",  color: "#61d4ff" },
  { value: "syllabus", label: "Syllabus", color: "#ffd761" },
  { value: "assignment", label: "Assignment", color: "#ff6b6b" },
  { value: "link",     label: "Link",     color: "#61ffb0" },
];

type AttachMode = "url" | "file" | "none";

type Material = {
  id: number;
  title: string;
  type: string;
  description?: string | null;
  url?: string | null;
  file?: { id: string; filename_download: string } | null;
};

type Props = {
  material: Material;
  onDone: () => void;
};

export default function EditMaterialForm({ material, onDone }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine initial attach mode
  const initialMode: AttachMode = material.file?.id
    ? "file"
    : material.url
    ? "url"
    : "none";

  const [title, setTitle]       = useState(material.title);
  const [type, setType]         = useState(material.type);
  const [description, setDescription] = useState(material.description ?? "");
  const [attachMode, setAttachMode]   = useState<AttachMode>(initialMode);
  const [urlValue, setUrlValue]       = useState(material.url ?? "");

  // Track current file state: the existing file, or a newly uploaded one
  const [currentFile, setCurrentFile] = useState<{ id: string; name: string } | null>(
    material.file ? { id: material.file.id, name: material.file.filename_download } : null
  );
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  // The original file ID so we can clean it up if replaced/removed
  const originalFileId = material.file?.id ?? null;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      const res = await fetch("/api/portal/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed.");
      }
      const json = await res.json();
      setCurrentFile({ id: json.data.id, name: json.data.filename_download });
    } catch (err) {
      setError(err instanceof Error ? err.message : "File upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !type) {
      setError("Title and type are required.");
      return;
    }
    if (attachMode === "file" && !currentFile) {
      setError("Please select a file to upload.");
      return;
    }

    setLoading(true);
    setError("");

    // Determine what file UUID to send
    const newFileId = attachMode === "file" ? (currentFile?.id ?? null) : null;
    // Only pass oldFileId if it's actually changing (so the API can delete it)
    const oldFileId = originalFileId && originalFileId !== newFileId ? originalFileId : undefined;

    try {
      const res = await fetch("/api/portal/materials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: material.id,
          title: title.trim(),
          type,
          description: description.trim() || null,
          url: attachMode === "url" ? urlValue || null : null,
          file: newFileId,
          oldFileId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update material.");
      }

      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // ─── Styles ─────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "rgba(13,13,26,0.8)",
    border: "1px solid rgba(123,97,255,0.25)",
    borderRadius: "8px",
    padding: "10px 12px",
    color: "#f0eeff",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: 600,
    color: "#808098",
    marginBottom: "5px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  };

  function modeBtn(mode: AttachMode): React.CSSProperties {
    const active = attachMode === mode;
    return {
      padding: "5px 12px",
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: 600,
      fontFamily: "inherit",
      cursor: "pointer",
      border: active ? "1px solid rgba(123,97,255,0.5)" : "1px solid rgba(123,97,255,0.15)",
      backgroundColor: active ? "rgba(123,97,255,0.15)" : "transparent",
      color: active ? "#a590ff" : "#606080",
    };
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: "rgba(20,20,40,0.9)",
        border: "1px solid rgba(123,97,255,0.25)",
        borderRadius: "10px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#a590ff" }}>Edit Material</span>
        <button
          type="button"
          onClick={onDone}
          style={{ background: "none", border: "none", color: "#606080", cursor: "pointer", fontSize: "18px", padding: 0, lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {/* Title + Type row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", alignItems: "end" }}>
        <div>
          <label style={labelStyle}>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ ...inputStyle, width: "auto", cursor: "pointer", appearance: "none", paddingRight: "24px" }}
          >
            {materialTypes.map((t) => (
              <option key={t.value} value={t.value} style={{ backgroundColor: "#1a1a2e" }}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Optional notes or context…"
          style={{ ...inputStyle, resize: "vertical", minHeight: "56px" }}
        />
      </div>

      {/* Attachment mode */}
      <div>
        <label style={labelStyle}>Attachment</label>
        <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
          <button type="button" style={modeBtn("none")} onClick={() => { setAttachMode("none"); setCurrentFile(null); }}>None</button>
          <button type="button" style={modeBtn("url")}  onClick={() => { setAttachMode("url"); setCurrentFile(null); }}>Link / URL</button>
          <button type="button" style={modeBtn("file")} onClick={() => {
            setAttachMode("file");
            if (!currentFile) setTimeout(() => fileInputRef.current?.click(), 50);
          }}>
            Upload File
          </button>
        </div>

        {attachMode === "url" && (
          <input
            type="url"
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="https://…"
            style={inputStyle}
          />
        )}

        {attachMode === "file" && (
          <div style={{
            border: "1px dashed rgba(123,97,255,0.25)",
            borderRadius: "8px",
            padding: "14px",
            textAlign: "center",
          }}>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
            {uploading ? (
              <p style={{ color: "#a0a0c0", fontSize: "12px", margin: 0 }}>Uploading…</p>
            ) : currentFile ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                <span style={{ color: "#61ffb0", fontSize: "12px" }}>✓ {currentFile.name}</span>
                <button
                  type="button"
                  onClick={() => { setCurrentFile(null); fileInputRef.current?.click(); }}
                  style={{ background: "none", border: "none", color: "#606080", cursor: "pointer", fontSize: "11px", fontFamily: "inherit" }}
                >
                  Replace
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: "#a0a0c0", fontSize: "12px", margin: "0 0 8px" }}>No file selected</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    backgroundColor: "rgba(123,97,255,0.1)",
                    border: "1px solid rgba(123,97,255,0.25)",
                    borderRadius: "6px", color: "#a590ff",
                    cursor: "pointer", fontFamily: "inherit",
                    fontSize: "12px", padding: "5px 12px",
                  }}
                >
                  Choose file
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div style={{
          backgroundColor: "rgba(255,80,80,0.08)",
          border: "1px solid rgba(255,80,80,0.2)",
          borderRadius: "8px", padding: "9px 12px",
          color: "#ff8080", fontSize: "12px",
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          type="submit"
          disabled={loading || uploading}
          style={{
            backgroundColor: (loading || uploading) ? "#4a3a99" : "#7b61ff",
            color: "white", border: "none",
            cursor: (loading || uploading) ? "not-allowed" : "pointer",
            fontWeight: 700, fontSize: "13px",
            padding: "9px 18px", borderRadius: "7px",
            fontFamily: "inherit",
            opacity: (loading || uploading) ? 0.7 : 1,
          }}
        >
          {loading ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onDone}
          style={{
            background: "none",
            border: "1px solid rgba(123,97,255,0.2)",
            color: "#a0a0c0", cursor: "pointer",
            fontSize: "13px", padding: "9px 16px",
            borderRadius: "7px", fontFamily: "inherit",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
