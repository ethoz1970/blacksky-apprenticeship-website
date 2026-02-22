"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type State = "idle" | "loading" | "success" | "error";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (!token) {
      setErrorMsg("This reset link is invalid or missing a token. Please request a new one.");
      setState("error");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError("");
    setErrorMsg("");

    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirm") as HTMLInputElement).value;

    if (password !== confirm) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setState("loading");

    try {
      const res = await fetch("/api/portal/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to reset password.");
      }

      setState("success");
      setTimeout(() => router.push("/portal/login"), 3000);
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

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "#a0a0c0",
    marginBottom: "8px",
    letterSpacing: "0.03em",
  };

  return (
    <div style={{ width: "100%", maxWidth: "420px" }}>
      {state === "success" ? (
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
            Password updated!
          </h1>
          <p style={{ fontSize: "15px", color: "#606080", lineHeight: 1.6 }}>
            Your password has been reset. Redirecting you to sign in…
          </p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "40px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#7b61ff", fontWeight: 700, marginBottom: "12px" }}>
              Portal
            </div>
            <h1 style={{ fontSize: "32px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", marginBottom: "8px" }}>
              Set new password
            </h1>
            <p style={{ fontSize: "15px", color: "#606080" }}>
              Choose a strong password for your account.
            </p>
          </div>

          {state === "error" && !token ? (
            <div style={{
              backgroundColor: "rgba(255,80,80,0.08)",
              border: "1px solid rgba(255,80,80,0.2)",
              borderRadius: "8px", padding: "14px 16px",
              color: "#ff8080", fontSize: "14px", marginBottom: "24px",
            }}>
              {errorMsg}{" "}
              <a href="/portal/forgot-password" style={{ color: "#ff8080", fontWeight: 600 }}>
                Request a new link
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div>
                <label htmlFor="password" style={labelStyle}>New password</label>
                <input
                  id="password" name="password" type="password" required
                  placeholder="Min. 8 characters"
                  minLength={8}
                  style={inputStyle}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label htmlFor="confirm" style={labelStyle}>Confirm password</label>
                <input
                  id="confirm" name="confirm" type="password" required
                  placeholder="Repeat your password"
                  style={inputStyle}
                  autoComplete="new-password"
                />
                {passwordError && (
                  <p style={{ color: "#ff8080", fontSize: "13px", margin: "6px 0 0" }}>{passwordError}</p>
                )}
              </div>

              {state === "error" && errorMsg && (
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
                {state === "loading" ? "Saving…" : "Set new password"}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main style={{ backgroundColor: "#0d0d1a", minHeight: "100vh", color: "#f0eeff", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav style={{ padding: "20px 40px", borderBottom: "1px solid rgba(123,97,255,0.1)" }}>
        <a href="/" style={{ fontSize: "17px", fontWeight: 700, color: "#f0eeff", textDecoration: "none" }}>
          Blacksky<span style={{ color: "#7b61ff" }}> Up</span>
        </a>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <Suspense fallback={<div style={{ color: "#606080" }}>Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
