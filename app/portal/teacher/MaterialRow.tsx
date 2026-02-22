"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EditMaterialForm from "./EditMaterialForm";

const typeColors: Record<string, string> = {
  document:   "#7b61ff",
  reading:    "#61d4ff",
  syllabus:   "#ffd761",
  assignment: "#ff6b6b",
  link:       "#61ffb0",
};

const typeIcons: Record<string, string> = {
  document:   "📄",
  reading:    "📖",
  syllabus:   "📋",
  assignment: "✏️",
  link:       "🔗",
};

const VIEWABLE_EXTENSIONS = new Set([
  "pdf", "png", "jpg", "jpeg", "gif", "webp", "svg",
  "mp4", "webm", "mp3", "wav", "ogg",
]);

function isViewable(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return VIEWABLE_EXTENSIONS.has(ext);
}

export type Material = {
  id: number;
  title: string;
  type: string;
  description?: string | null;
  url?: string | null;
  file?: { id: string; filename_download: string } | null;
  date_created?: string;
};

export default function MaterialRow({ material }: { material: Material }) {
  const router = useRouter();
  const [isEditing, setIsEditing]   = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hoverDelete, setHoverDelete] = useState(false);
  const [hoverEdit, setHoverEdit]     = useState(false);

  const color    = typeColors[material.type] || "#7b61ff";
  const icon     = typeIcons[material.type]  || "📎";
  const filename = material.file?.filename_download ?? "";
  const canView  = !!material.file?.id && isViewable(filename);

  async function handleDelete() {
    if (!confirm("Delete this material? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/portal/materials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: material.id,
          fileId: material.file?.id ?? null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || "Failed to delete.");
      } else {
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  }

  const btnStyle = (variant: "view" | "download" | "link"): React.CSSProperties => ({
    fontSize: "11px", fontWeight: 600, textDecoration: "none",
    display: "inline-flex", alignItems: "center", gap: "3px",
    padding: "3px 10px", borderRadius: "5px",
    ...(variant === "view"
      ? { color: "#f0eeff", backgroundColor: "rgba(123,97,255,0.15)", border: "1px solid rgba(123,97,255,0.3)" }
      : variant === "download"
      ? { color: "#a0a0c0", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }
      : { color: "#a590ff", backgroundColor: "rgba(165,144,255,0.08)", border: "1px solid rgba(165,144,255,0.2)" }),
  });

  if (isEditing) {
    return (
      <EditMaterialForm
        material={material}
        onDone={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div style={{
      backgroundColor: "rgba(26,26,46,0.5)",
      border: "1px solid rgba(123,97,255,0.1)",
      borderRadius: "8px", padding: "14px 16px",
      display: "flex", alignItems: "flex-start", gap: "12px",
    }}>
      <span style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>{icon}</span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#f0eeff" }}>{material.title}</span>
          <span style={{
            backgroundColor: `${color}18`,
            border: `1px solid ${color}35`,
            borderRadius: "100px", padding: "1px 7px",
            fontSize: "10px", fontWeight: 600, color,
            textTransform: "capitalize",
          }}>
            {material.type}
          </span>
        </div>
        {material.description && (
          <p style={{ color: "#808098", fontSize: "12px", lineHeight: 1.5, margin: "0 0 6px" }}>
            {material.description}
          </p>
        )}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
          {material.url && (
            <a href={material.url} target="_blank" rel="noopener noreferrer" style={btnStyle("link")}>
              Open link →
            </a>
          )}
          {canView && (
            <a href={`/api/portal/files/${material.file!.id}?inline=1`} target="_blank" rel="noopener noreferrer" style={btnStyle("view")}>
              View ↗
            </a>
          )}
          {material.file?.id && (
            <a href={`/api/portal/files/${material.file.id}`} style={btnStyle("download")}>
              Download ↓
            </a>
          )}
        </div>
      </div>

      {/* Edit + Delete actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
        {/* Edit button */}
        <button
          onClick={() => setIsEditing(true)}
          title="Edit material"
          onMouseEnter={() => setHoverEdit(true)}
          onMouseLeave={() => setHoverEdit(false)}
          style={{
            background: "none", border: "none",
            color: hoverEdit ? "#a590ff" : "#505070",
            cursor: "pointer", fontSize: "14px",
            padding: "3px 5px", lineHeight: 1,
            transition: "color 0.15s",
          }}
        >
          ✎
        </button>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          title="Delete material"
          onMouseEnter={() => setHoverDelete(true)}
          onMouseLeave={() => setHoverDelete(false)}
          style={{
            background: "none", border: "none",
            color: isDeleting ? "#404060" : hoverDelete ? "#ff6b6b" : "#604060",
            cursor: isDeleting ? "not-allowed" : "pointer",
            fontSize: "14px", padding: "3px 5px",
            lineHeight: 1, transition: "color 0.15s",
          }}
        >
          {isDeleting ? "…" : "✕"}
        </button>
      </div>
    </div>
  );
}
