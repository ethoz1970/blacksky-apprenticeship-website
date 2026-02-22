"use client";

import { useState } from "react";

type State = "idle" | "loading" | "success" | "error";

export default function PasswordSection() {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError("");
    setErrorMsg("");

    const form = e.currentTarget;
    const current_password = (form.elements.namedItem("current_password") as HTMLInputElement).value;
    const new_password = (form.elements.namedItem("new_password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirm") as HTMLInputElement).value;

    if (new_password !== confirm) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setState("loading");

    try {
      const res = await fetch("/api/portal/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password, new_password }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to update password.");
      }

      setState("success");
      form.reset();
      setTimeout(() => setState("idle"), 4000);
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "rgba(13,13,26,0.8)",
    border: "1px solid rgba(123,97,255,0.25)",
    borderRadius: "8px",
    padding: "12px 14px",
    color: "#f0eeff",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "#a0a0c0",
    marginBottom: "6px",
    letterSpacing: "0.03em",
  };

  return (
    <div style={{
      backgroundColor: "rgba(26,26,46,0.6)",
      border: "1px solid rgba(123,97,255,0.15)",
      borderRadius: "12px",
      padding: "28px",
      marginTop: "32px",
    }}>
      <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#f0eeff", margin: "0 0 4px" }}>
        Change Password
      </h2>
      <p style={{ fontSize: "13px", color: "#606080", margin: "0 0 24px" }}>
        Update your password. You&apos;ll need your current password to confirm.
      </p>

      {state === "success" && (
        <div style={{
          backgroundColor: "rgba(97,255,176,0.08)",
          border: "1px solid rgba(97,255,176,0.25)",
          borderRadius: "8px", padding: "12px 16px",
          color: "#61ffb0", fontSize: "13px", marginBottom: "20px",
        }}>
          Password updated successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div>
          <label htmlFor="current_password" style={labelStyle}>Current password</label>
          <input
            id="current_password" name="current_password" type="password" required
            placeholder="Your current password"
            style={inputStyle}
            autoComplete="current-password"
          />
        </div>

        <div>
          <label htmlFor="new_password" style={labelStyle}>New password</label>
          <input
            id="new_password" name="new_password" type="password" required
            placeholder="Min. 8 characters"
            minLength={8}
            style={inputStyle}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="confirm" style={labelStyle}>Confirm new password</label>
          <input
            id="confirm" name="confirm" type="password" required
            placeholder="Repeat new password"
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
            borderRadius: "8px", padding: "10px 14px",
            color: "#ff8080", fontSize: "13px",
          }}>
            {errorMsg}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={state === "loading"}
            style={{
              backgroundColor: state === "loading" ? "#4a3a99" : "#7b61ff",
              color: "white", border: "none",
              cursor: state === "loading" ? "not-allowed" : "pointer",
              fontWeight: 700, fontSize: "14px",
              padding: "11px 22px", borderRadius: "8px",
              fontFamily: "inherit",
              opacity: state === "loading" ? 0.7 : 1,
            }}
          >
            {state === "loading" ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}
