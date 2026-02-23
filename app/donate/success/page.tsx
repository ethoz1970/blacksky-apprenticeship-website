export default function DonateSuccessPage() {
  return (
    <main style={{ backgroundColor: "#0d0d1a", minHeight: "100vh", color: "#f0eeff" }}>

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
      </nav>

      {/* ── CONTENT ──────────────────────────────────────────── */}
      <div style={{
        maxWidth: "520px", margin: "0 auto",
        padding: "160px 24px 100px",
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center",
      }}>

        {/* Check mark */}
        <div style={{
          width: "72px", height: "72px", borderRadius: "50%",
          backgroundColor: "rgba(123,97,255,0.12)",
          border: "2px solid rgba(123,97,255,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "32px", marginBottom: "32px",
        }}>
          ✓
        </div>

        <h1 style={{
          fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 800,
          letterSpacing: "-0.02em", lineHeight: 1.1,
          color: "white", marginBottom: "20px",
        }}>
          Thank you.
        </h1>

        <p style={{
          fontSize: "18px", color: "#a0a0c0", lineHeight: 1.8,
          marginBottom: "16px",
        }}>
          Your donation helps keep Blacksky Up free for everyone.
        </p>
        <p style={{
          fontSize: "15px", color: "#606080", lineHeight: 1.7,
          marginBottom: "48px",
        }}>
          You&rsquo;ll receive a receipt from Stripe at the email you provided.
          Every dollar goes toward building more courses and supporting our teachers.
        </p>

        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "center" }}>
          <a href="/" style={{
            backgroundColor: "#7b61ff", color: "white", textDecoration: "none",
            fontWeight: 700, fontSize: "15px", padding: "13px 28px",
            borderRadius: "8px",
          }}>
            Back to Home
          </a>
          <a href="/donate" style={{
            backgroundColor: "rgba(123,97,255,0.08)",
            border: "1px solid rgba(123,97,255,0.25)",
            color: "#a590ff", textDecoration: "none",
            fontWeight: 600, fontSize: "15px", padding: "13px 28px",
            borderRadius: "8px",
          }}>
            Donate again
          </a>
        </div>

      </div>

    </main>
  );
}
