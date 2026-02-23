"use client";

const disciplineColors: Record<string, string> = {
  media: "#ff6b6b",
  tech: "#7b61ff",
  business: "#61d4ff",
  arts: "#ffd761",
};

const heroGradients = (color: string) => [
  `radial-gradient(ellipse at 20% 50%, ${color}40 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, ${color}25 0%, transparent 55%), linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 100%)`,
  `radial-gradient(ellipse at 75% 60%, ${color}35 0%, transparent 55%), radial-gradient(ellipse at 25% 30%, ${color}20 0%, transparent 50%), linear-gradient(135deg, #12122a 0%, #0d0d1a 100%)`,
  `radial-gradient(circle at 50% 80%, ${color}30 0%, transparent 50%), radial-gradient(circle at 30% 20%, ${color}22 0%, transparent 45%), linear-gradient(160deg, #0d0d1a 0%, #1a1a2e 100%)`,
  `radial-gradient(ellipse at 60% 40%, ${color}38 0%, transparent 58%), radial-gradient(ellipse at 10% 70%, ${color}20 0%, transparent 45%), linear-gradient(120deg, #1a1a2e 0%, #0d0d1a 100%)`,
];

type CourseCardProps = {
  id: number;
  name: string;
  discipline: string;
  description?: string | null;
  index: number;
};

export default function CourseCard({ id, name, discipline, description, index }: CourseCardProps) {
  const color    = disciplineColors[discipline] ?? "#7b61ff";
  const gradient = heroGradients(color)[index % 4];

  return (
    <a href={`/courses/${id}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{
          backgroundColor: "rgba(18,18,36,0.8)",
          border: "1px solid rgba(123,97,255,0.15)",
          borderRadius: "16px", overflow: "hidden",
          display: "flex", flexDirection: "column",
          transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform    = "translateY(-4px)";
          el.style.borderColor  = `${color}50`;
          el.style.boxShadow    = `0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px ${color}20`;
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.transform   = "translateY(0)";
          el.style.borderColor = "rgba(123,97,255,0.15)";
          el.style.boxShadow   = "none";
        }}
      >
        {/* ── Hero image placeholder ───────────────────────── */}
        <div style={{
          height: "220px", position: "relative",
          background: gradient,
          overflow: "hidden",
        }}>
          {/* Decorative geometry */}
          <div style={{
            position: "absolute", top: "24px", right: "28px",
            width: "80px", height: "80px", borderRadius: "50%",
            border: `1px solid ${color}30`,
          }} />
          <div style={{
            position: "absolute", bottom: "-20px", left: "20px",
            width: "120px", height: "120px", borderRadius: "50%",
            border: `1px solid ${color}20`,
          }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%) rotate(45deg)",
            width: "60px", height: "60px",
            border: `1px solid ${color}22`,
          }} />

          {/* Discipline tag */}
          <div style={{
            position: "absolute", top: "20px", left: "20px",
            backgroundColor: "rgba(13,13,26,0.75)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${color}40`,
            borderRadius: "100px", padding: "5px 14px",
            fontSize: "11px", color, fontWeight: 700,
            textTransform: "capitalize", letterSpacing: "0.04em",
          }}>
            {discipline}
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────── */}
        <div style={{ padding: "28px 32px 32px", display: "flex", flexDirection: "column", flex: 1 }}>
          <h3 style={{
            fontSize: "21px", fontWeight: 800, color: "#f0eeff",
            marginBottom: "12px", letterSpacing: "-0.01em", lineHeight: 1.2,
          }}>
            {name}
          </h3>

          {description && (
            <p style={{
              fontSize: "15px", color: "#9090b0", lineHeight: 1.75,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              marginBottom: "24px", flex: 1,
            } as React.CSSProperties}>
              {description}
            </p>
          )}

          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            fontSize: "14px", color, fontWeight: 700, marginTop: "auto",
          }}>
            Read more <span>→</span>
          </div>
        </div>
      </div>
    </a>
  );
}

import React from "react";
