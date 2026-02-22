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

type Props = {
  classId: number;
};

export default function MaterialForm({ classId }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value;
    const type = (form.elements.namedItem("type") as HTMLSelectElement).value;
    const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value;
    const url = (form.elements.namedItem("url") as HTMLInputElement).value;

    try {
      const res = await fetch("/api/portal/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: classId, title, type, description, url }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to add material.");
      }

      formRef.current?.reset();
      setOpen(false);
      router.refresh(); // Re-fetch server component data
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          backgroundColor: "rgba(123,97,255,0.12)",
          border: "1px solid rgba(123,97,255,0.3)",
          borderRadius: "8px",
          color: "#a590ff",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "14px",
          fontWeight: 600,
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
      borderRadius: "12px",
      padding: "28px",
      marginBottom: "8px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#f0eeff" }}>Add Material</h3>
        <button
          onClick={() => { setOpen(false); setError(""); }}
          style={{ background: "none", border: "none", color: "#606080", cursor: "pointer", fontSize: "20px", padding: 0 }}
        >
          ×
        </button>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <label style={labelStyle}>Title *</label>
          <input name="title" type="text" required placeholder="e.g. Week 1 Reading" style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>Type *</label>
          <select name="type" required defaultValue="document" style={{ ...inputStyle, cursor: "pointer", appearance: "none" }}>
            {materialTypes.map((t) => (
              <option key={t.value} value={t.value} style={{ backgroundColor: "#1a1a2e" }}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            name="description"
            rows={3}
            placeholder="Optional description or notes..."
            style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
          />
        </div>

        <div>
          <label style={labelStyle}>URL <span style={{ color: "#606080", fontWeight: 400 }}>(for links & readings)</span></label>
          <input name="url" type="url" placeholder="https://..." style={inputStyle} />
        </div>

        {error && (
          <div style={{
            backgroundColor: "rgba(255,80,80,0.08)",
            border: "1px solid rgba(255,80,80,0.2)",
            borderRadius: "8px", padding: "12px 14px",
            color: "#ff8080", fontSize: "13px",
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? "#4a3a99" : "#7b61ff",
              color: "white", border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 700, fontSize: "14px",
              padding: "12px 24px", borderRadius: "8px",
              fontFamily: "inherit",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Adding…" : "Add Material"}
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setError(""); }}
            style={{
              background: "none",
              border: "1px solid rgba(123,97,255,0.2)",
              color: "#a0a0c0", cursor: "pointer",
              fontSize: "14px", padding: "12px 20px",
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
