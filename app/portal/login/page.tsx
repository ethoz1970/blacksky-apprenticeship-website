"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FormState = "idle" | "loading" | "error";

export default function PortalLoginPage() {
  const router = useRouter();
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Login failed.");
      }

      // Redirect to the role-appropriate portal
      router.push(json.redirectTo || "/portal");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "#a0a0c0",
    marginBottom: "8px",
    letterSpacing: "0.03em",
  };

  return (
    <main style={{ backgroundColor: "#0d0d1a", minHeight: "100vh", color: "#f0eeff", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav style={{ padding: "20px 40px", borderBottom: "1px solid rgba(123,97,255,0.1)" }}>
        <a href="/" style={{ fontSize: "17px", fontWeight: 700, color: "#f0eeff", textDecoration: "none" }}>
          Blacksky<span style={{ color: "#7b61ff" }}> Up</span>
        </a>
      </nav>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>
          <div style={{ marginBottom: "40px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#7b61ff", fontWeight: 700, marginBottom: "12px" }}>
              Portal
            </div>
            <h1 style={{ fontSize: "36px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", marginBottom: "8px" }}>
              Sign in
            </h1>
            <p style={{ fontSize: "15px", color: "#606080" }}>
              Access your student or teacher portal.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <label htmlFor="email" style={labelStyle}>Email</label>
              <input
                id="email" name="email" type="email" required
                placeholder="you@example.com"
                style={inputStyle}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" style={labelStyle}>Password</label>
              <input
                id="password" name="password" type="password" required
                placeholder="••••••••"
                style={inputStyle}
                autoComplete="current-password"
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
              {state === "loading" ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
