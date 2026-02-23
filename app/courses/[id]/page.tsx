import { notFound } from "next/navigation";
import { getCourse, getCourses } from "@/lib/directus";

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

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await getCourse(Number(id));
  if (!course) notFound();

  const color = disciplineColors[course.discipline] ?? "#7b61ff";

  return (
    <main style={{ backgroundColor: "#0d0d1a", minHeight: "100vh", color: "#f0eeff" }}>

      {/* ── NAV ───────────────────────────────────────────────── */}
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
            fontWeight: 700, fontSize: "13px", padding: "8px 18px",
            borderRadius: "6px",
          }}>
            Apply
          </a>
        </div>
      </nav>

      {/* ── COURSE CONTENT ────────────────────────────────────── */}
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "140px 40px 100px" }}>

        {/* Back link */}
        <a href="/#courses" style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          fontSize: "13px", color: "#606080", textDecoration: "none",
          marginBottom: "40px",
        }}>
          ← Back to courses
        </a>

        {/* Discipline tag */}
        <div style={{
          display: "inline-block",
          backgroundColor: `${color}15`,
          border: `1px solid ${color}35`,
          borderRadius: "100px", padding: "4px 14px", fontSize: "12px",
          color: color, fontWeight: 600, textTransform: "capitalize",
          marginBottom: "20px",
        }}>
          {course.discipline}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800,
          letterSpacing: "-0.02em", lineHeight: 1.1,
          color: "white", marginBottom: "36px",
        }}>
          {course.name}
        </h1>

        {/* Divider */}
        <div style={{ height: "1px", backgroundColor: "rgba(123,97,255,0.15)", marginBottom: "40px" }} />

        {/* Description */}
        {course.description && (
          <div style={{
            fontSize: "17px", lineHeight: 1.85,
            color: "#c0c0dc",
            whiteSpace: "pre-wrap",
          }}>
            {course.description}
          </div>
        )}

        {/* Apply CTA */}
        <div style={{
          marginTop: "64px",
          padding: "40px",
          backgroundColor: "rgba(123,97,255,0.06)",
          border: "1px solid rgba(123,97,255,0.18)",
          borderRadius: "16px",
          textAlign: "center",
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

      {/* ── FOOTER ────────────────────────────────────────────── */}
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
