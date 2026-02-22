"use client";

import { useState } from "react";

const disciplines = [
  { value: "media", label: "Media" },
  { value: "tech", label: "Technology" },
  { value: "business", label: "Business" },
  { value: "arts", label: "Arts" },
];

type FormState = "idle" | "loading" | "success" | "error";

export default function ApplyPage() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      discipline: (form.elements.namedItem("discipline") as HTMLSelectElement).value,
      why_join: (form.elements.namedItem("why_join") as HTMLTextAreaElement).value,
      background: (form.elements.namedItem("background") as HTMLTextAreaElement).value,
      portfolio_url: (form.elements.namedItem("portfolio_url") as HTMLInputElement).value,
    };

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Something went wrong");
      }
      setState("success");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  const inputStyle = {
    width: "100%",
    backgroundColor: "rgba(26,26,46,0.6)",
    border: "1px solid rgba(123,97,255,0.2)",
    borderRadius: "8px",
    padding: "14px 16px",
    color: "#f0eeff",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "#a0a0c0",
    marginBottom: "8px",
    letterSpacing: "0.03em",
  };

  if (state === "success") {
    return (
      <main style={{ backgroundColor: "#0d0d1a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <div style={{ textAlign: "center", maxWidth: "520px" }}>
          <div style={{ fontSize: "48px", marginBottom: "24px" }}>✦</div>
          <h1 style={{ fontSize: "36px", fontWeight: 800, color: "white", marginBottom: "16px", letterSpacing: "-0.02em" }}>
            You&apos;re in.
          </h1>
          <p style={{ fontSize: "18px", color: "#a0a0c0", lineHeight: 1.75, marginBottom: "12px" }}>
            Your application has been received. Check your inbox for a confirmation — we&apos;ll be in touch soon.
          </p>
          <p style={{ fontSize: "14px", color: "#606080", marginBottom: "40px" }}>
            In the meantime, feel free to explore the program.
          </p>
          <a href="/" style={{ backgroundColor: "#7b61ff", color: "white", textDecoration: "none", fontWeight: 700, fontSize: "15px", padding: "14px 32px", borderRadius: "8px", display: "inline-block" }}>
            Back to Home
          </a>
        </div>
      </main>
    );
  }

  return (
    <main style={{ backgroundColor: "#0d0d1a", minHeight: "100vh", color: "#f0eeff" }}>

      <style>{`
        @media (max-width: 640px) {
          .apply-nav  { padding: 16px 20px !important; }
          .apply-body { padding: 56px 20px !important; }
          .apply-btn  { width: 100%; box-sizing: border-box; }
        }
      `}</style>

      {/* Nav */}
      <nav className="apply-nav" style={{ padding: "20px 40px", borderBottom: "1px solid rgba(123,97,255,0.1)" }}>
        <a href="/" className="logo-link" style={{ fontSize: "17px", fontWeight: 700, color: "#f0eeff" }}>
          Blacksky<span style={{ color: "#7b61ff" }}> Up</span>
        </a>
      </nav>

      <div className="apply-body" style={{ maxWidth: "640px", margin: "0 auto", padding: "80px 40px" }}>

        {/* Header */}
        <div style={{ marginBottom: "56px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#7b61ff", fontWeight: 700, marginBottom: "16px" }}>
            Apply Free
          </div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 52px)", fontWeight: 800, color: "white", letterSpacing: "-0.02em", marginBottom: "16px", lineHeight: 1.1 }}>
            Start your apprenticeship.
          </h1>
          <p style={{ fontSize: "17px", color: "#a0a0c0", lineHeight: 1.7 }}>
            No tuition. No prerequisites. Just show up ready to learn. We review every application personally.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

          {/* Name */}
          <div>
            <label htmlFor="name" style={labelStyle}>Full Name <span style={{ color: "#7b61ff" }}>*</span></label>
            <input id="name" name="name" type="text" required placeholder="Your full name" style={inputStyle} />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" style={labelStyle}>Email Address <span style={{ color: "#7b61ff" }}>*</span></label>
            <input id="email" name="email" type="email" required placeholder="you@example.com" style={inputStyle} />
          </div>

          {/* Discipline */}
          <div>
            <label htmlFor="discipline" style={labelStyle}>Chosen Discipline <span style={{ color: "#7b61ff" }}>*</span></label>
            <select id="discipline" name="discipline" required style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
              <option value="" disabled selected>Select your discipline...</option>
              {disciplines.map((d) => (
                <option key={d.value} value={d.value} style={{ backgroundColor: "#1a1a2e" }}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Why join */}
          <div>
            <label htmlFor="why_join" style={labelStyle}>Why do you want to join? <span style={{ color: "#7b61ff" }}>*</span></label>
            <textarea
              id="why_join" name="why_join" required rows={4}
              placeholder="Tell us what drew you to the Blacksky Apprenticeship Program and what you hope to get out of it..."
              style={{ ...inputStyle, resize: "vertical", minHeight: "120px" }}
            />
          </div>

          {/* Background */}
          <div>
            <label htmlFor="background" style={labelStyle}>Your Background <span style={{ color: "#7b61ff" }}>*</span></label>
            <textarea
              id="background" name="background" required rows={4}
              placeholder="Where are you coming from? Tell us about your experience, interests, and what you're working toward..."
              style={{ ...inputStyle, resize: "vertical", minHeight: "120px" }}
            />
          </div>

          {/* Portfolio */}
          <div>
            <label htmlFor="portfolio_url" style={labelStyle}>
              Portfolio / Work Samples
              <span style={{ color: "#606080", fontWeight: 400, marginLeft: "8px" }}>optional but recommended</span>
            </label>
            <input
              id="portfolio_url" name="portfolio_url" type="url"
              placeholder="https://yourportfolio.com"
              style={inputStyle}
            />
          </div>

          {/* Error */}
          {state === "error" && (
            <div style={{ backgroundColor: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: "8px", padding: "14px 16px", color: "#ff8080", fontSize: "14px" }}>
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={state === "loading"}
            className="apply-btn"
            style={{
              backgroundColor: state === "loading" ? "#4a3a99" : "#7b61ff",
              color: "white", border: "none", cursor: state === "loading" ? "not-allowed" : "pointer",
              fontWeight: 700, fontSize: "16px", padding: "18px 32px",
              borderRadius: "8px", fontFamily: "inherit",
              opacity: state === "loading" ? 0.7 : 1,
              transition: "all 0.2s ease",
            }}
          >
            {state === "loading" ? "Submitting..." : "Submit Application"}
          </button>

          <p style={{ fontSize: "13px", color: "#606080", textAlign: "center" }}>
            We review every application personally and respond within a few days.
          </p>
        </form>
      </div>
    </main>
  );
}
