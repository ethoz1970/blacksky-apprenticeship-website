import { notFound } from "next/navigation";
import { getCourse, getCourses } from "@/lib/directus";
import { getRichContent, type RichCourseContent } from "@/lib/course-content";

export const revalidate = 60;

const disciplineColors: Record<string, string> = {
  media: "#ff6b6b",
  tech: "#7b61ff",
  business: "#61d4ff",
  arts: "#ffd761",
};

export async function generateStaticParams() {
  const courses = await getCourses();
  return courses.map((c) => ({ id: String(c.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(Number(id));
  if (!course) return { title: "Course Not Found" };
  return {
    title: `${course.name} — Blacksky Up`,
    description: course.description?.slice(0, 160),
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase",
      color: "#7b61ff", fontWeight: 700, marginBottom: "12px",
    }}>
      {children}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      backgroundColor: "rgba(26,26,46,0.6)",
      border: "1px solid rgba(123,97,255,0.15)",
      borderRadius: "12px", padding: "28px 32px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <span style={{ color: "#7b61ff", marginTop: "2px", flexShrink: 0, fontSize: "13px" }}>◈</span>
          <span style={{ fontSize: "15px", color: "#b0b0cc", lineHeight: 1.65 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function RichSyllabus({ rich, color }: { rich: RichCourseContent; color: string }) {
  return (
    <>
      {/* ── About ──────────────────────────────────────────── */}
      <section style={{ marginBottom: "56px" }}>
        <SectionLabel>About This Course</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {rich.about.map((para, i) => (
            <p key={i} style={{ fontSize: "17px", color: "#c0c0dc", lineHeight: 1.85, margin: 0 }}>
              {para}
            </p>
          ))}
        </div>
      </section>

      {/* ── Details ────────────────────────────────────────── */}
      <section style={{ marginBottom: "56px" }}>
        <SectionLabel>Course Details</SectionLabel>
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "0" }}>
            {rich.details.map((row, i) => (
              <React.Fragment key={i}>
                <div style={{
                  padding: "12px 24px 12px 0",
                  borderBottom: i < rich.details.length - 1 ? "1px solid rgba(123,97,255,0.08)" : "none",
                  fontWeight: 700, fontSize: "13px", color: "#7070a0",
                  whiteSpace: "nowrap",
                }}>
                  {row.label}
                </div>
                <div style={{
                  padding: "12px 0",
                  borderBottom: i < rich.details.length - 1 ? "1px solid rgba(123,97,255,0.08)" : "none",
                  fontSize: "15px", color: "#d0d0e8", lineHeight: 1.5,
                }}>
                  {row.value}
                </div>
              </React.Fragment>
            ))}
          </div>
        </Card>
      </section>

      {/* ── Weeks / Sessions ───────────────────────────────── */}
      {rich.weeks.map((week, wi) => (
        <section key={wi} style={{ marginBottom: "56px" }}>
          <SectionLabel>{week.title}</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {week.sessions.map((session, si) => (
              <Card key={si}>
                {/* Session header */}
                <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "20px" }}>
                  <span style={{
                    fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
                    textTransform: "uppercase", color: color, flexShrink: 0,
                  }}>
                    {session.number}
                  </span>
                  <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#f0eeff", margin: 0 }}>
                    {session.title}
                  </h3>
                </div>

                {/* Concepts */}
                {session.concepts.length > 0 && (
                  <div style={{ marginBottom: "24px" }}>
                    <div style={{
                      fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
                      color: "#505070", fontWeight: 600, marginBottom: "12px",
                    }}>
                      Core Concepts
                    </div>
                    <BulletList items={session.concepts} />
                  </div>
                )}

                {/* Activity */}
                {session.activity.length > 0 && (
                  <div style={{
                    backgroundColor: `${color}08`,
                    border: `1px solid ${color}20`,
                    borderRadius: "8px", padding: "20px",
                  }}>
                    <div style={{
                      fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
                      color: color, fontWeight: 700, marginBottom: "12px",
                    }}>
                      {session.activityLabel ?? "Hands-On Activity"}
                    </div>
                    <BulletList items={session.activity} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      ))}

      {/* ── Capstone ───────────────────────────────────────── */}
      <section style={{ marginBottom: "56px" }}>
        <SectionLabel>Capstone Project</SectionLabel>
        <Card>
          {/* Quote */}
          <blockquote style={{
            margin: "0 0 28px",
            padding: "20px 24px",
            backgroundColor: "rgba(123,97,255,0.06)",
            borderLeft: `3px solid ${color}`,
            borderRadius: "0 8px 8px 0",
          }}>
            <p style={{
              fontSize: "16px", color: "#c8c8e8",
              fontStyle: "italic", lineHeight: 1.7, margin: 0,
            }}>
              &ldquo;{rich.capstone.quote}&rdquo;
            </p>
          </blockquote>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            {/* Requirements */}
            <div>
              <div style={{
                fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
                color: "#505070", fontWeight: 600, marginBottom: "14px",
              }}>
                Project Requirements
              </div>
              <BulletList items={rich.capstone.requirements} />
            </div>
            {/* Demo Day */}
            <div>
              <div style={{
                fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
                color: "#505070", fontWeight: 600, marginBottom: "14px",
              }}>
                Demo Day Criteria
              </div>
              <BulletList items={rich.capstone.demoCriteria} />
            </div>
          </div>
        </Card>
      </section>

      {/* ── Learning Outcomes ──────────────────────────────── */}
      <section style={{ marginBottom: "56px" }}>
        <SectionLabel>Learning Outcomes</SectionLabel>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {rich.outcomes.map((outcome, i) => (
              <div key={i} style={{
                display: "flex", gap: "20px", alignItems: "flex-start",
                padding: "16px 0",
                borderBottom: i < rich.outcomes.length - 1 ? "1px solid rgba(123,97,255,0.08)" : "none",
              }}>
                <span style={{
                  flexShrink: 0, width: "28px", height: "28px",
                  borderRadius: "50%",
                  backgroundColor: `${color}15`,
                  border: `1px solid ${color}35`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: 700, color: color,
                }}>
                  {outcome.num}
                </span>
                <span style={{ fontSize: "15px", color: "#c0c0dc", lineHeight: 1.65, paddingTop: "4px" }}>
                  {outcome.text}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

import React from "react";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(Number(id));
  if (!course) notFound();

  const color = disciplineColors[course.discipline] ?? "#7b61ff";
  const rich  = getRichContent(course.name);

  return (
    <main style={{ backgroundColor: "#0d0d1a", minHeight: "100vh", color: "#f0eeff" }}>

      <style>{`
        @media (max-width: 640px) {
          .capstone-grid { grid-template-columns: 1fr !important; }
          .details-grid  { grid-template-columns: 1fr !important; }
          .course-pad    { padding: 120px 20px 80px !important; }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 40px",
        backgroundColor: "rgba(13,13,26,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(123,97,255,0.15)",
      }}>
        <a href="/" style={{ fontSize: "18px", fontWeight: 700, color: "#f0eeff", letterSpacing: "-0.02em", textDecoration: "none" }}>
          Blacksky<span style={{ color: "#7b61ff" }}> Up</span>
        </a>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <a href="/#courses" style={{ color: "#a0a0c0", textDecoration: "none", fontSize: "14px" }}>Courses</a>
          <a href="/apply" style={{
            backgroundColor: "#7b61ff", color: "white", textDecoration: "none",
            fontWeight: 700, fontSize: "13px", padding: "8px 18px", borderRadius: "6px",
          }}>
            Apply
          </a>
        </div>
      </nav>

      {/* ── CONTENT ─────────────────────────────────────────── */}
      <div className="course-pad" style={{ maxWidth: "860px", margin: "0 auto", padding: "140px 40px 100px" }}>

        {/* Back */}
        <a href="/#courses" style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          fontSize: "13px", color: "#606080", textDecoration: "none", marginBottom: "40px",
        }}>
          ← Back to courses
        </a>

        {/* Discipline tag */}
        <div style={{ marginBottom: "20px" }}>
          <span style={{
            display: "inline-block",
            backgroundColor: `${color}15`,
            border: `1px solid ${color}35`,
            borderRadius: "100px", padding: "4px 14px", fontSize: "12px",
            color: color, fontWeight: 600, textTransform: "capitalize",
          }}>
            {course.discipline}
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800,
          letterSpacing: "-0.02em", lineHeight: 1.1,
          color: "white", marginBottom: "48px",
        }}>
          {course.name}
        </h1>

        {/* Divider */}
        <div style={{ height: "1px", backgroundColor: "rgba(123,97,255,0.15)", marginBottom: "56px" }} />

        {/* Rich syllabus or plain description fallback */}
        {rich ? (
          <RichSyllabus rich={rich} color={color} />
        ) : (
          course.description && (
            <section style={{ marginBottom: "56px" }}>
              <p style={{ fontSize: "17px", color: "#c0c0dc", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
                {course.description}
              </p>
            </section>
          )
        )}

        {/* ── Apply CTA ───────────────────────────────────────── */}
        <div style={{
          marginTop: "24px", padding: "40px",
          backgroundColor: "rgba(123,97,255,0.06)",
          border: "1px solid rgba(123,97,255,0.18)",
          borderRadius: "16px", textAlign: "center",
        }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#f0eeff", marginBottom: "12px" }}>
            Ready to join this course?
          </h2>
          <p style={{ fontSize: "15px", color: "#a0a0c0", marginBottom: "28px", lineHeight: 1.7 }}>
            Blacksky Up is completely free. Apply now and start learning.
          </p>
          <a href="/apply" style={{
            backgroundColor: "#7b61ff", color: "white", textDecoration: "none",
            fontWeight: 700, fontSize: "16px", padding: "14px 36px",
            borderRadius: "8px", display: "inline-block",
          }}>
            Apply Now
          </a>
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid rgba(123,97,255,0.1)",
        padding: "32px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "16px",
      }}>
        <span style={{ fontSize: "15px", fontWeight: 700, color: "#f0eeff" }}>
          Blacksky<span style={{ color: "#7b61ff" }}> Up</span>
        </span>
        <span style={{ fontSize: "13px", color: "#606080" }}>
          Free education. Real knowledge. No exceptions.
        </span>
      </footer>

    </main>
  );
}
