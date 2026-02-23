import React from "react";
import { cookies } from "next/headers";
import { getCourses } from "@/lib/directus";
import CourseCard from "@/app/CourseCard";

const disciplineColors: Record<string, string> = {
  media: "#ff6b6b",
  tech: "#7b61ff",
  business: "#61d4ff",
  arts: "#ffd761",
};

export const revalidate = 60;

export default async function HomePage() {
  const cookieStore = await cookies();
  const token      = cookieStore.get("directus_token")?.value;
  const role       = cookieStore.get("portal_role")?.value;
  const firstName  = cookieStore.get("portal_name")?.value;

  const isLoggedIn = !!token;
  const isTeacher  = role === "teacher";
  const isStudent  = role === "student";

  // Determine portal destination and labels
  const portalHref  = isTeacher ? "/portal/teacher" : isStudent ? "/portal/student" : "/portal";
  const portalLabel = isTeacher ? "My Dashboard" : "My Portal";

  // Hero CTA copy
  let heroCtaHref  = "/apply";
  let heroCtaLabel = "Apply Now";
  if (isTeacher) { heroCtaHref = "/portal/teacher"; heroCtaLabel = "Go to My Dashboard"; }
  else if (isStudent) { heroCtaHref = "/portal/student"; heroCtaLabel = "Go to My Portal"; }
  else if (isLoggedIn) { heroCtaHref = "/portal"; heroCtaLabel = "Check Your Status"; }

  const courses = await getCourses();

  return (
    <main style={{ backgroundColor: "#0d0d1a", minHeight: "100vh", color: "#f0eeff" }}>

      <style>{`
        @media (max-width: 640px) {
          .nav-pad       { padding: 14px 20px !important; }
          .hero-section  { padding: 110px 20px 90px !important; }
          .pills         { display: none !important; }
          .section-pad   { padding: 72px 20px !important; }
          .blockquote    { padding: 24px 20px !important; margin-top: 40px !important; }
          .why-section   { padding: 60px 20px !important; }
          .courses-grid  { grid-template-columns: 1fr !important; gap: 20px !important; }
          .cta-btn-lg    { padding: 16px 32px !important; font-size: 16px !important; width: 100%; box-sizing: border-box; text-align: center; }
          .footer-pad    { padding: 28px 20px !important; }
          .nav-links     { gap: 16px !important; }
          .nav-signin    { display: none !important; }
        }
      `}</style>

      {/* ── NAV ───────────────────────────────────────────────── */}
      <nav className="nav-pad" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 40px",
        backgroundColor: "rgba(13,13,26,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(123,97,255,0.15)",
      }}>
        <a href="#" style={{ fontSize: "18px", fontWeight: 700, color: "#f0eeff", letterSpacing: "-0.02em", textDecoration: "none" }}>
          Blacksky<span style={{ color: "#7b61ff" }}> Up</span>
        </a>

        <div className="nav-links" style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <a href="#courses" style={{ color: "#a0a0c0", textDecoration: "none", fontSize: "14px" }}>Courses</a>
          <a className="nav-signin" href="/donate" style={{ color: "#a0a0c0", textDecoration: "none", fontSize: "14px" }}>Donate</a>

          {isLoggedIn ? (
            /* Logged-in state */
            <>
              {firstName && (
                <span className="nav-signin" style={{ fontSize: "13px", color: "#606080" }}>
                  Hey, {firstName}
                </span>
              )}
              <a href={portalHref} style={{
                backgroundColor: "#7b61ff", color: "white", textDecoration: "none",
                fontWeight: 700, fontSize: "13px", padding: "8px 18px",
                borderRadius: "6px", whiteSpace: "nowrap",
              }}>
                {portalLabel} →
              </a>
            </>
          ) : (
            /* Guest state */
            <>
              <a className="nav-signin" href="/portal/login" style={{ color: "#a0a0c0", textDecoration: "none", fontSize: "14px" }}>
                Sign In
              </a>
              <a href="/apply" style={{
                backgroundColor: "#7b61ff", color: "white", textDecoration: "none",
                fontWeight: 700, fontSize: "13px", padding: "8px 18px",
                borderRadius: "6px",
              }}>
                Apply
              </a>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="hero-section" style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "140px 40px 100px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        {/* Glow */}
        <div style={{
          position: "absolute", top: "40%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "700px", height: "500px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(123,97,255,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", maxWidth: "820px" }}>
          <div style={{
            display: "inline-block",
            backgroundColor: "rgba(123,97,255,0.1)",
            border: "1px solid rgba(123,97,255,0.3)",
            borderRadius: "100px", padding: "6px 18px", marginBottom: "36px",
            fontSize: "12px", color: "#a590ff", fontWeight: 600,
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            Pure learning · No strings · No fees
          </div>

          <h1 style={{
            fontSize: "clamp(44px, 7vw, 84px)", fontWeight: 800,
            lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: "28px", color: "white",
          }}>
            The future of{" "}
            <span className="learning-word">learning</span>
            .
          </h1>

          <p style={{
            fontSize: "clamp(16px, 2vw, 20px)", color: "#a0a0c0", lineHeight: 1.75,
            maxWidth: "580px", margin: "0 auto 52px",
          }}>
            Blacksky Up is a free apprenticeship program in media, technology, business, and the arts.
            We&apos;re not a college. We&apos;re not an academy.
            We&apos;re something older — and better.
          </p>

          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            {/* Primary CTA — context-aware */}
            <a href={heroCtaHref} style={{
              backgroundColor: "#7b61ff", color: "white", textDecoration: "none",
              fontWeight: 700, fontSize: "16px", padding: "16px 36px", borderRadius: "8px",
            }}>
              {heroCtaLabel}
            </a>

            {/* Secondary — always Browse Courses */}
            <a href="#courses" style={{
              backgroundColor: "rgba(123,97,255,0.08)",
              border: "1px solid rgba(123,97,255,0.25)",
              color: "#a590ff", textDecoration: "none",
              fontWeight: 600, fontSize: "16px", padding: "16px 36px", borderRadius: "8px",
            }}>
              Courses
            </a>
          </div>

          {/* Subtle sign-in nudge for guests */}
          {!isLoggedIn && (
            <p style={{ marginTop: "28px", fontSize: "13px", color: "#505070" }}>
              Already applied?{" "}
              <a href="/portal/login" style={{ color: "#7b61ff", textDecoration: "none", fontWeight: 600 }}>
                Sign in to check your status →
              </a>
            </p>
          )}
        </div>

        {/* Discipline pills */}
        <div className="pills" style={{
          position: "absolute", bottom: "40px",
          display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center",
        }}>
          {["◈ Media", "◎ Technology", "◇ Business", "◉ Arts"].map((d) => (
            <span key={d} style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "100px", padding: "6px 16px",
              fontSize: "13px", color: "#606080",
            }}>{d}</span>
          ))}
        </div>
      </section>

      {/* ── MISSION ───────────────────────────────────────────── */}
      <section id="mission" className="section-pad" style={{ padding: "120px 40px", maxWidth: "860px", margin: "0 auto" }}>
        <div style={{
          fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase",
          color: "#7b61ff", fontWeight: 700, marginBottom: "28px",
        }}>
          Our Mission
        </div>

        <p style={{
          fontSize: "clamp(20px, 2.5vw, 26px)", lineHeight: 1.65,
          color: "#d0d0e8", marginBottom: "36px", fontWeight: 400,
        }}>
          Blacksky Up exists to revive the oldest model of learning
          the world has ever known — and bring it fully into the future.
        </p>

        <p style={{ fontSize: "clamp(15px, 1.8vw, 19px)", lineHeight: 1.8, color: "#a0a0c0", marginBottom: "28px" }}>
          The apprenticeship is not a relic. It is the most powerful form of education
          humanity has ever practiced — a direct, living transmission of knowledge between
          someone who knows and someone who wants to know. Somewhere along the way, we
          traded that for tuition bills and lecture halls. We believe that was a mistake.
          And we&apos;re correcting it.
        </p>

        <p style={{ fontSize: "clamp(15px, 1.8vw, 19px)", lineHeight: 1.8, color: "#a0a0c0", marginBottom: "28px" }}>
          Blacksky is free — completely, unconditionally free — because access to knowledge
          should never be a privilege. But we&apos;re building toward something even more
          radical: a program that{" "}
          <strong style={{ color: "#d0d0e8", fontWeight: 600 }}>pays its students to be here</strong>.
          Because if we truly believe in someone&apos;s potential, we should be willing to
          invest in it. Not ask them to prove it first.
        </p>

        <p style={{ fontSize: "clamp(15px, 1.8vw, 19px)", lineHeight: 1.8, color: "#a0a0c0" }}>
          We are not an academy. We are not a college. We are an apprenticeship program —
          because the deepest learning has never happened in a classroom. It happens in the
          space between a master and a student, in the practice of a craft, in the moment
          when knowledge stops being abstract and becomes real. That tradition was lost.
          We&apos;re bringing it back.
        </p>

        <blockquote className="blockquote" style={{
          margin: "60px 0 0", padding: "36px 48px",
          backgroundColor: "rgba(123,97,255,0.06)",
          borderLeft: "3px solid #7b61ff",
          borderRadius: "0 12px 12px 0",
        }}>
          <p style={{
            fontSize: "clamp(17px, 2vw, 22px)", lineHeight: 1.65,
            color: "#c8c8e8", fontStyle: "italic", margin: 0,
          }}>
            &ldquo;The deepest learning has never happened in a classroom. It happens in
            the space between a master and a student — in the moment when knowledge stops
            being abstract and becomes real.&rdquo;
          </p>
        </blockquote>
      </section>

      {/* ── WHY APPRENTICESHIP ────────────────────────────────── */}
      <section className="why-section" style={{
        padding: "80px 40px",
        backgroundColor: "rgba(26,26,46,0.35)",
        borderTop: "1px solid rgba(123,97,255,0.08)",
        borderBottom: "1px solid rgba(123,97,255,0.08)",
      }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "48px" }}>
          {[
            { icon: "⟳", title: "The lost art, rediscovered", body: "Apprenticeship is humanity's original learning model. Before degrees, before student debt, there was a master and a student. One taught. One learned. Both grew. We're bringing that back." },
            { icon: "∞", title: "Learning by doing", body: "Theory matters. But nothing replaces building, failing, iterating, and building again alongside someone who has already walked the road. That's what we offer." },
            { icon: "◈", title: "Radical access", body: "Free means free. No hidden fees, no income share agreements, no catch. And soon — scholarships that pay you to be here. Because your time has value." },
          ].map((item) => (
            <div key={item.title}>
              <div style={{ fontSize: "28px", color: "#7b61ff", marginBottom: "16px" }}>{item.icon}</div>
              <h3 style={{ fontSize: "19px", fontWeight: 700, color: "#f0eeff", marginBottom: "12px" }}>{item.title}</h3>
              <p style={{ fontSize: "15px", lineHeight: 1.75, color: "#a0a0c0" }}>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── COURSES ───────────────────────────────────────────── */}
      <section id="courses" className="section-pad" style={{ padding: "120px 40px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#7b61ff", fontWeight: 700, marginBottom: "16px" }}>
          Courses
        </div>
        <h2 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, color: "white", letterSpacing: "-0.02em", marginBottom: "16px" }}>
          What you&apos;ll learn
        </h2>
        <p style={{ fontSize: "17px", color: "#a0a0c0", marginBottom: "64px", maxWidth: "480px", lineHeight: 1.7 }}>
          Hands-on courses across four disciplines. All free. All built around real skills that matter.
        </p>

        <div className="courses-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "32px" }}>
          {courses.length > 0 ? courses.map((course, idx) => (
            <CourseCard
              key={course.id}
              id={course.id}
              name={course.name}
              discipline={course.discipline}
              description={course.description}
              index={idx}
            />
          )) : (
            <>
              <CourseCard id={0} name="LLM 101: Language Models & You" discipline="tech"
                description="A two-week, no-code introduction to large language models and retrieval-augmented generation. Understand the systems. Build something real." index={0} />
              <div style={{
                backgroundColor: "rgba(26,26,46,0.2)",
                border: "1px dashed rgba(123,97,255,0.18)",
                borderRadius: "16px",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                textAlign: "center", minHeight: "340px",
              }}>
                <div style={{ fontSize: "28px", color: "#3d2e7a", marginBottom: "14px" }}>+</div>
                <p style={{ fontSize: "14px", color: "#606080", lineHeight: 1.6 }}>More courses coming soon.</p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── APPLY CTA ─────────────────────────────────────────── */}
      <section id="apply" className="section-pad" style={{ padding: "120px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: "900px", height: "500px",
          background: "radial-gradient(ellipse, rgba(123,97,255,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", maxWidth: "620px", margin: "0 auto" }}>
          {isLoggedIn ? (
            /* Logged-in variant */
            <>
              <h2 style={{
                fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 800, color: "white",
                letterSpacing: "-0.02em", marginBottom: "20px",
              }}>
                {isStudent ? "Keep learning." : isTeacher ? "Shape the next generation." : "Your journey continues."}
              </h2>
              <p style={{ fontSize: "18px", color: "#a0a0c0", lineHeight: 1.75, marginBottom: "48px" }}>
                {isStudent
                  ? "Head to your portal to access your class, materials, and teacher."
                  : isTeacher
                  ? "Your dashboard has everything you need to manage your class."
                  : "Check your application status and see what's next for you."}
              </p>
              <a href={portalHref} className="cta-btn-lg" style={{
                backgroundColor: "#7b61ff", color: "white", textDecoration: "none",
                fontWeight: 700, fontSize: "18px", padding: "20px 52px",
                borderRadius: "10px", display: "inline-block",
              }}>
                {portalLabel} →
              </a>
            </>
          ) : (
            /* Guest variant */
            <>
              <h2 style={{
                fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 800, color: "white",
                letterSpacing: "-0.02em", marginBottom: "20px",
              }}>
                Ready to learn?
              </h2>
              <p style={{ fontSize: "18px", color: "#a0a0c0", lineHeight: 1.75, marginBottom: "48px" }}>
                It&apos;s free. It&apos;s real. And it&apos;s built around the belief that
                the right knowledge, in the right hands, changes everything.
              </p>
              <a href="/apply" className="cta-btn-lg" style={{
                backgroundColor: "#7b61ff", color: "white", textDecoration: "none",
                fontWeight: 700, fontSize: "18px", padding: "20px 52px",
                borderRadius: "10px", display: "inline-block",
              }}>
                Apply Now
              </a>
              <p style={{ fontSize: "13px", color: "#606080", marginTop: "20px" }}>
                No tuition. No prerequisites. Just show up ready to learn.
              </p>
            </>
          )}
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="footer-pad" style={{
        borderTop: "1px solid rgba(123,97,255,0.1)",
        padding: "36px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px",
      }}>
        <span style={{ fontSize: "15px", fontWeight: 700, color: "#f0eeff" }}>
          Blacksky<span style={{ color: "#7b61ff" }}> Up</span>
        </span>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#606080" }}>
            Free education. Real knowledge. No exceptions.
          </span>
          {!isLoggedIn && (
            <a href="/portal/login" style={{ fontSize: "13px", color: "#a0a0c0", textDecoration: "none" }}>
              Sign In
            </a>
          )}
        </div>
      </footer>

    </main>
  );
}
