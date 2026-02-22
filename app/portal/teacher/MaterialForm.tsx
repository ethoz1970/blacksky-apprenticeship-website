"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const materialTypes = [
  { value: "document", label: "Document", color: "#7b61ff" },
  { value: "reading", label: "Reading", color: "#61d4ff" },
  { value: "syllabus", label: "Syllabus", color: "#ffd761" },
  { value: "assignment", label: "Assignment", color: "#ff6b6b" },
  { value: "link", label: "Link", color: "#61ffb0" },
];

type AttachMode = "url" | "file" | "none";

type Props = {
  classId: number;
};

export default function MaterialForm({ classId }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attachMode, setAttachMode] = useState<AttachMode>("none");
  const [uploadedFile, setUploadedFile] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);

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
      setUploadedFile({ id: json.data.id, name: json.data.filename_download });
    } catch (err) {
      setError(err instanceof Error ? err.message : "File upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value;
    const type = (form.elements.namedItem("type") as HTMLSelectElement).value;
    const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value;
    const urlField = form.elements.namedItem("url") as HTMLInputElement | null;
    const url = urlField?.value || "";

    if (attachMode === "file" && !uploadedFile) {
      setError("Please select and upload a file first.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/portal/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: classId,
          title,
          type,
          description,
          url: attachMode === "url" ? url : null,
          file: attachMode === "file" ? uploadedFile?.id : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to add material.");
      }

      formRef.current?.reset();
      setOpen(false);
      setAttachMode("none");
      setUploadedFile(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function closeForm() {
    setOpen(false);
    setError("");
    setAttachMode("none");
    setUploadedFile(null);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "rgba(13,13,26,0.8)",
    border: "1px solid rgba(123,97,255,0.25)",
    borderRadius: "8px",
    padding: "12px 14px",
    color: "#f0eeff",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "#a0a0c0",
    marginBottom: "6px",
    letterSpacing: "0.03em",
  };

  function modeBtn(mode: AttachMode): React.CSSProperties {
    return {
      padding: "6px 14px",
      borderRadius: "6px",
      fontSize: "13px",
      fontWeight: 600,
      fontFamily: "inherit",
      cursor: "pointer",
      transition: "all 0.15s",
      border: attachMode === mode
        ? "1px solid rgba(123,97,255,0.6)"
        : "1px solid rgba(123,97,255,0.2)",
      backgroundColor: attachMode === mode
        ? "rgba(123,97,255,0.18)"
        : "transparent",
      color: attachMode === mode ? "#a590ff" : "#606080",
    };
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          backgroundColor: "rgba(123,97,255,0.12)",
          border: "1px solid rgba(123,97,255,0.3)",
          borderRadius: "8px", color: "#a590ff",
          cursor: "pointer", fontFamily: "inherit",
          fontSize: "14px", fontWeight: 600,
          padding: "10px 20px",
        }}
      >
        + Add Material
      </button>
    );
  }

  return (
    <div style={{
      backgroundColor: "rgba(26,26,46,0.8)",
      border: "1px solid rgba(123,97,255,0.2)",
      borderRadius: "12px", padding: "24px",
      marginBottom: "8px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#f0eeff" }}>Add Material</h3>
        <button
          onClick={closeForm}
          style={{ background: "none", border: "none", color: "#606080", cursor: "pointer", fontSize: "20px", padding: 0, lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

        {/* Title */}
        <div>
          <label style={labelStyle}>Title *</label>
          <input name="title" type="text" required placeholder="e.g. Week 1 Reading" style={inputStyle} />
        </div>

        {/* Type */}
        <div>
          <label style={labelStyle}>Type *</label>
          <select name="type" required defaultValue="document" style={{ ...inputStyle, cursor: "pointer", appearance: "none" }}>
            {materialTypes.map((t) => (
              <option key={t.value} value={t.value} style={{ backgroundColor: "#1a1a2e" }}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            name="description" rows={2}
            placeholder="Optional notes or context..."
            style={{ ...inputStyle, resize: "vertical", minHeight: "64px" }}
          />
        </div>

        {/* Attach — URL or File */}
        <div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "#a0a0c0", letterSpacing: "0.03em", marginBottom: "10px" }}>
            Attachment
          </div>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <button type="button" style={modeBtn("none")} onClick={() => setAttachMode("none")}>None</button>
            <button type="button" style={modeBtn("url")} onClick={() => setAttachMode("url")}>Link / URL</button>
            <button type="button" style={modeBtn("file")} onClick={() => {
              setAttachMode("file");
              setTimeout(() => fileInputRef.current?.click(), 50);
            }}>
              Upload File
            </button>
          </div>

          {attachMode === "url" && (
            <input name="url" type="url" placeholder="https://..." style={inputStyle} />
          )}

          {attachMode === "file" && (
            <div style={{
              border: "1px dashed rgba(123,97,255,0.3)",
              borderRadius: "8px", padding: "16px",
              textAlign: "center",
            }}>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />
              {uploading ? (
                <p style={{ color: "#a0a0c0", fontSize: "13px", margin: 0 }}>Uploading…</p>
              ) : uploadedFile ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                  <span style={{ color: "#61ffb0", fontSize: "13px" }}>✓ {uploadedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => { setUploadedFile(null); fileInputRef.current?.click(); }}
                    style={{ background: "none", border: "none", color: "#606080", cursor: "pointer", fontSize: "12px", fontFamily: "inherit" }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ color: "#a0a0c0", fontSize: "13px", margin: "0 0 8px" }}>No file selected</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      backgroundColor: "rgba(123,97,255,0.1)",
                      border: "1px solid rgba(123,97,255,0.25)",
                      borderRadius: "6px", color: "#a590ff",
                      cursor: "pointer", fontFamily: "inherit",
                      fontSize: "12px", padding: "6px 14px",
                    }}
                  >
                    Choose file
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            backgroundColor: "rgba(255,80,80,0.08)",
            border: "1px solid rgba(255,80,80,0.2)",
            borderRadius: "8px", padding: "10px 14px",
            color: "#ff8080", fontSize: "13px",
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="submit"
            disabled={loading || uploading}
            style={{
              backgroundColor: (loading || uploading) ? "#4a3a99" : "#7b61ff",
              color: "white", border: "none",
              cursor: (loading || uploading) ? "not-allowed" : "pointer",
              fontWeight: 700, fontSize: "14px",
              padding: "11px 22px", borderRadius: "8px",
              fontFamily: "inherit",
              opacity: (loading || uploading) ? 0.7 : 1,
            }}
          >
            {loading ? "Adding…" : "Add Material"}
          </button>
          <button
            type="button"
            onClick={closeForm}
            style={{
              background: "none",
              border: "1px solid rgba(123,97,255,0.2)",
              color: "#a0a0c0", cursor: "pointer",
              fontSize: "14px", padding: "11px 18px",
              borderRadius: "8px", fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
