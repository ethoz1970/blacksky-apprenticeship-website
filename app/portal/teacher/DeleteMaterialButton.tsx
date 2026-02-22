"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteMaterialButton({ materialId }: { materialId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this material? This cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/portal/materials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: materialId }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || "Failed to delete.");
      } else {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Delete material"
      style={{
        background: "none",
        border: "none",
        color: loading ? "#404060" : "#604060",
        cursor: loading ? "not-allowed" : "pointer",
        fontSize: "16px",
        padding: "2px 4px",
        flexShrink: 0,
        lineHeight: 1,
        transition: "color 0.15s",
      }}
      onMouseEnter={(e) => { if (!loading) (e.target as HTMLButtonElement).style.color = "#ff6b6b"; }}
      onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = loading ? "#404060" : "#604060"; }}
    >
      {loading ? "…" : "✕"}
    </button>
  );
}
