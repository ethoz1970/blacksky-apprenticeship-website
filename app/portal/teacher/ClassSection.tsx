"use client";

import { useState } from "react";
import MaterialForm from "./MaterialForm";
import MaterialRow, { type Material } from "./MaterialRow";

const disciplineColors: Record<string, string> = {
  media:    "#ff6b6b",
  tech:     "#7b61ff",
  business: "#61d4ff",
  arts:     "#ffd761",
};

type Student = { id: string; first_name: string; last_name?: string };

export type ClassData = {
  id: number;
  name: string;
  description?: string;
  discipline: string;
  students?: Student[];
  materials?: Material[];
};

export default function ClassSection({ cls }: { cls: ClassData }) {
  const [expanded, setExpanded] = useState(true);

  const color     = disciplineColors[cls.discipline] || "#7b61ff";
  const students  = cls.students  || [];
  const materials = cls.materials || [];

  return (
    <div style={{
      backgroundColor: "rgba(26,26,46,0.6)",
      border: "1px solid rgba(123,97,255,0.15)",
      borderRadius: "14px",
      overflow: "hidden",
    }}>

      {/* ── Header row — always visible, click to toggle ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "22px 28px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          textAlign: "left",
          fontFamily: "inherit",
          // subtle hover handled via onMouseEnter/Leave below
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(123,97,255,0.04)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
        }}
      >
        {/* Discipline tag */}
        <span style={{
          backgroundColor: `${color}15`,
          border: `1px solid ${color}35`,
          borderRadius: "100px",
          padding: "3px 10px",
          fontSize: "10px",
          fontWeight: 700,
          color,
          textTransform: "capitalize",
          flexShrink: 0,
          letterSpacing: "0.04em",
        }}>
          {cls.discipline}
        </span>

        {/* Class name */}
        <span style={{
          fontSize: "17px",
          fontWeight: 800,
          color: "white",
          letterSpacing: "-0.01em",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {cls.name}
        </span>

        {/* Count pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <Pill label="Students" count={students.length} color="#a590ff" />
          <Pill label="Materials" count={materials.length} color="#61d4ff" />
        </div>

        {/* Chevron */}
        <span style={{
          color: "#505070",
          fontSize: "12px",
          flexShrink: 0,
          marginLeft: "4px",
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease",
          display: "inline-block",
        }}>
          ▼
        </span>
      </button>

      {/* ── Expanded body ── */}
      {expanded && (
        <div style={{
          borderTop: "1px solid rgba(123,97,255,0.1)",
          padding: "28px",
        }}>
          {/* Class description */}
          {cls.description && (
            <p style={{
              color: "#a0a0c0",
              fontSize: "14px",
              lineHeight: 1.7,
              margin: "0 0 28px",
              paddingBottom: "28px",
              borderBottom: "1px solid rgba(123,97,255,0.08)",
            }}>
              {cls.description}
            </p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "32px" }}>

            {/* Students column */}
            <div>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#f0eeff", marginBottom: "14px", margin: "0 0 14px", letterSpacing: "0.03em", textTransform: "uppercase" }}>
                Students ({students.length})
              </h3>
              {students.length === 0 ? (
                <p style={{ color: "#606080", fontSize: "13px", margin: 0 }}>No students enrolled yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  {students.map((s) => (
                    <div key={s.id} style={{
                      backgroundColor: "rgba(26,26,46,0.5)",
                      border: "1px solid rgba(123,97,255,0.1)",
                      borderRadius: "8px",
                      padding: "9px 13px",
                      fontSize: "13px",
                      color: "#d0d0e8",
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                    }}>
                      <span style={{
                        width: "26px", height: "26px", borderRadius: "50%",
                        backgroundColor: "rgba(123,97,255,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "11px", fontWeight: 700, color: "#a590ff",
                        flexShrink: 0,
                      }}>
                        {(s.first_name || "?")[0].toUpperCase()}
                      </span>
                      {s.first_name} {s.last_name || ""}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Materials column */}
            <div>
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#f0eeff", margin: "0 0 14px", letterSpacing: "0.03em", textTransform: "uppercase" }}>
                Materials ({materials.length})
              </h3>

              <div style={{ marginBottom: "14px" }}>
                <MaterialForm classId={cls.id} />
              </div>

              {materials.length === 0 ? (
                <p style={{ color: "#606080", fontSize: "13px", margin: 0 }}>No materials posted yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  {materials.map((m) => (
                    <MaterialRow key={m.id} material={m} />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function Pill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      backgroundColor: `${color}10`,
      border: `1px solid ${color}25`,
      borderRadius: "100px",
      padding: "3px 10px",
      fontSize: "11px",
      fontWeight: 600,
      color: color,
    }}>
      {label}
      <span style={{
        backgroundColor: `${color}20`,
        borderRadius: "100px",
        padding: "0px 6px",
        fontSize: "11px",
        fontWeight: 700,
      }}>
        {count}
      </span>
    </span>
  );
}
