"use client";

import { useState } from "react";

const PRESET_AMOUNTS = [5, 10, 25, 50, 100];

export default function DonatePage() {
  const [selected, setSelected]   = useState<number | null>(25);
  const [custom, setCustom]       = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const effectiveAmount = custom ? parseFloat(custom) : selected;

  async function handleDonate() {
    const amount = effectiveAmount;
    if (!amount || amount < 1) {
      setError("Please enter an amount of at least $1.");
      return;
    }
    if (amount > 10000) {
      setError("Maximum donation is $10,000.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Unknown error");
      window.location.href = data.url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

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

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: "30%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "600px", height: "400px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(123,97,255,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ── CONTENT ──────────────────────────────────────────── */}
      <div style={{
        maxWidth: "560px", margin: "0 auto",
        padding: "140px 24px 100px",
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center",
      }}>

        {/* Eyebrow */}
        <div style={{
          display: "inline-block",
          backgroundColor: "rgba(123,97,255,0.1)",
          border: "1px solid rgba(123,97,255,0.3)",
          borderRadius: "100px", padding: "5px 18px", marginBottom: "28px",
          fontSize: "12px", color: "#a590ff", fontWeight: 600,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          Support the mission
        </div>

        <h1 style={{
          fontSize: "clamp(36px, 6vw, 58px)", fontWeight: 800,
          letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: "20px",
          color: "white",
        }}>
          Keep education free.
        </h1>

        <p style={{
          fontSize: "17px", color: "#a0a0c0", lineHeight: 1.8,
          marginBottom: "52px", maxWidth: "440px",
        }}>
          Blacksky Up charges students nothing — and never will.
          Every donation goes directly toward building more courses,
          supporting teachers, and one day paying students to be here.
        </p>

        {/* ── Donation card ───────────────────────────────────── */}
        <div style={{
          width: "100%",
          backgroundColor: "rgba(26,26,46,0.7)",
          border: "1px solid rgba(123,97,255,0.18)",
          borderRadius: "16px", padding: "36px",
          backdropFilter: "blur(8px)",
        }}>

          <div style={{ fontSize: "13px", color: "#7070a0", fontWeight: 600, marginBottom: "16px", textAlign: "left" }}>
            SELECT AMOUNT
          </div>

          {/* Preset buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "16px" }}>
            {PRESET_AMOUNTS.map((amt) => {
              const active = !custom && selected === amt;
              return (
                <button
                  key={amt}
                  onClick={() => { setSelected(amt); setCustom(""); setError(""); }}
                  style={{
                    padding: "12px 4px",
                    borderRadius: "8px",
                    border: active ? "2px solid #7b61ff" : "1px solid rgba(123,97,255,0.2)",
                    backgroundColor: active ? "rgba(123,97,255,0.15)" : "rgba(123,97,255,0.04)",
                    color: active ? "#c0b0ff" : "#8080a0",
                    fontWeight: 700, fontSize: "15px",
                    cursor: "pointer", transition: "all 0.15s ease",
                  }}
                >
                  ${amt}
                </button>
              );
            })}
          </div>

          {/* Custom amount */}
          <div style={{ position: "relative", marginBottom: "28px" }}>
            <span style={{
              position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
              color: "#7070a0", fontSize: "16px", fontWeight: 600,
              pointerEvents: "none",
            }}>
              $
            </span>
            <input
              type="number"
              min="1"
              max="10000"
              placeholder="Custom amount"
              value={custom}
              onChange={(e) => { setCustom(e.target.value); setSelected(null); setError(""); }}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "13px 14px 13px 28px",
                backgroundColor: "rgba(123,97,255,0.06)",
                border: custom ? "1px solid rgba(123,97,255,0.5)" : "1px solid rgba(123,97,255,0.15)",
                borderRadius: "8px",
                color: "#f0eeff", fontSize: "15px",
                outline: "none",
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: "16px", padding: "10px 14px",
              backgroundColor: "rgba(255,100,100,0.08)",
              border: "1px solid rgba(255,100,100,0.25)",
              borderRadius: "8px",
              fontSize: "13px", color: "#ff9090",
            }}>
              {error}
            </div>
          )}

          {/* Donate button */}
          <button
            onClick={handleDonate}
            disabled={loading || !effectiveAmount}
            style={{
              width: "100%", padding: "16px",
              backgroundColor: loading ? "rgba(123,97,255,0.4)" : "#7b61ff",
              color: "white", border: "none", borderRadius: "10px",
              fontWeight: 700, fontSize: "17px",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background-color 0.2s ease",
              letterSpacing: "-0.01em",
            }}
          >
            {loading
              ? "Redirecting to Stripe…"
              : effectiveAmount
                ? `Donate $${Number(effectiveAmount).toFixed(0)}`
                : "Select an amount"}
          </button>

          <p style={{ fontSize: "12px", color: "#404060", marginTop: "16px", lineHeight: 1.6 }}>
            Secure payment via Stripe. Blacksky Up is not currently a 501(c)(3) —
            donations are not tax-deductible at this time.
          </p>
        </div>

        {/* Quote */}
        <blockquote style={{
          marginTop: "52px", padding: "28px 32px",
          backgroundColor: "rgba(123,97,255,0.05)",
          borderLeft: "3px solid #7b61ff",
          borderRadius: "0 12px 12px 0",
          textAlign: "left",
        }}>
          <p style={{ fontSize: "16px", color: "#c0c0dc", fontStyle: "italic", lineHeight: 1.75, margin: 0 }}>
            &ldquo;We are building toward something radical: a program that pays its students
            to be here. Because if we truly believe in someone&rsquo;s potential, we should
            be willing to invest in it.&rdquo;
          </p>
        </blockquote>

      </div>

      {/* ── FOOTER ───────────────────────────────────────────── */}
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
