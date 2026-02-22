"use client";

import { useState } from "react";

type State = "idle" | "loading" | "sent" | "error";

export default function ForgotPasswordPage() {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");

    const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value;

    try {
      const res = await fetch("/api/portal/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Something went wrong.");
      }

      setState("sent");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "rgba(26,26,46,0.6)",
    border: "1px solid rgba(123,97,255,0.2)",
    borderRadius: "8px",
    padding: "14px 16px",
    color: "#f0eeff",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <main style={{ backgroundColor: "#0d0d1a", minHeight: "100vh", color: "#f0eeff", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav style={{ padding: "20px 40px", borderBottom: "1px solid rgba(123,97,255,0.1)" }}>
        <a href="/" style={{ fontSize: "17px", fontWeight: 700, color: "#f0eeff", textDecoration: "none" }}>
          Blacksky<span style={{ color: "#7b61ff" }}> Up</span>
        </a>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>

          {state === "sent" ? (
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: "64px", height: "64px",
                backgroundColor: "rgba(97,255,176,0.1)",
                border: "1px solid rgba(97,255,176,0.3)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 24px",
                fontSize: "28px",
              }}>
                ✓
              </div>
              <h1 style={{ fontSize: "28px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", marginBottom: "12px" }}>
                Check your email
              </h1>
              <p style={{ fontSize: "15px", color: "#606080", lineHeight: 1.6, marginBottom: "32px" }}>
                If an account with that address exists, we&apos;ve sent a password reset link. Check your inbox (and spam folder).
              </p>
              <a
                href="/portal/login"
                style={{
                  display: "inline-block",
                  color: "#a590ff",
                  fontSize: "14px",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                ← Back to sign in
              </a>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "40px" }}>
                <div style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#7b61ff", fontWeight: 700, marginBottom: "12px" }}>
                  Portal
                </div>
                <h1 style={{ fontSize: "32px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", marginBottom: "8px" }}>
                  Reset your password
                </h1>
                <p style={{ fontSize: "15px", color: "#606080" }}>
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div>
                  <label
                    htmlFor="email"
                    style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#a0a0c0", marginBottom: "8px", letterSpacing: "0.03em" }}
                  >
                    Email
                  </label>
                  <input
                    id="email" name="email" type="email" required
                    placeholder="you@example.com"
                    style={inputStyle}
                    autoComplete="email"
                  />
                </div>

                {state === "error" && (
                  <div style={{
                    backgroundColor: "rgba(255,80,80,0.08)",
                    border: "1px solid rgba(255,80,80,0.2)",
                    borderRadius: "8px", padding: "14px 16px",
                    color: "#ff8080", fontSize: "14px",
                  }}>
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={state === "loading"}
                  style={{
                    backgroundColor: state === "loading" ? "#4a3a99" : "#7b61ff",
                    color: "white", border: "none",
                    cursor: state === "loading" ? "not-allowed" : "pointer",
                    fontWeight: 700, fontSize: "16px",
                    padding: "16px 24px", borderRadius: "8px",
                    fontFamily: "inherit",
                    opacity: state === "loading" ? 0.7 : 1,
                    transition: "all 0.2s ease",
                  }}
                >
                  {state === "loading" ? "Sending…" : "Send reset link"}
                </button>

                <div style={{ textAlign: "center" }}>
                  <a href="/portal/login" style={{ color: "#606080", fontSize: "14px", textDecoration: "none" }}>
                    ← Back to sign in
                  </a>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
