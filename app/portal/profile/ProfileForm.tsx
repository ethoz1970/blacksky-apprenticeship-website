"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Props = {
  user: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    avatar?: string | null;
  };
  backHref: string;
};

export default function ProfileForm({ user, backHref }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user.first_name || "");
  const [lastName, setLastName] = useState(user.last_name || "");
  const [avatarId, setAvatarId] = useState<string | null>(user.avatar || null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user.avatar ? `/api/portal/files/${user.avatar}` : null
  );

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ─── Avatar pick ────────────────────────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    setUploadingAvatar(true);
    setSaveMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file, file.name);
      const res = await fetch("/api/portal/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed.");
      }
      const json = await res.json();
      setAvatarId(json.data?.id || null);
    } catch (err) {
      setSaveMsg({ type: "error", text: err instanceof Error ? err.message : "Avatar upload failed." });
      // Revert preview
      setAvatarPreview(user.avatar ? `/api/portal/files/${user.avatar}` : null);
      setAvatarId(user.avatar || null);
    } finally {
      setUploadingAvatar(false);
    }
  }

  // ─── Save profile ────────────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, avatar: avatarId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Save failed.");
      }
      setSaveMsg({ type: "success", text: "Profile updated!" });
      router.refresh();
    } catch (err) {
      setSaveMsg({ type: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setSaving(false);
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
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

      {/* Avatar */}
      <div>
        <div style={labelStyle}>Profile Photo</div>
        <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
          {/* Avatar circle */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "96px", height: "96px", borderRadius: "50%",
              backgroundColor: "rgba(123,97,255,0.15)",
              border: "2px solid rgba(123,97,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: uploadingAvatar ? "not-allowed" : "pointer",
              overflow: "hidden", flexShrink: 0, position: "relative",
              transition: "border-color 0.2s",
            }}
          >
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Avatar"
                fill
                style={{ objectFit: "cover" }}
                unoptimized
              />
            ) : (
              <span style={{ fontSize: "36px", color: "#a590ff", lineHeight: 1, userSelect: "none" }}>
                {(firstName || "?")[0]?.toUpperCase()}
              </span>
            )}
            {uploadingAvatar && (
              <div style={{
                position: "absolute", inset: 0,
                backgroundColor: "rgba(0,0,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", color: "white",
              }}>
                …
              </div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              style={{
                backgroundColor: "rgba(123,97,255,0.12)",
                border: "1px solid rgba(123,97,255,0.3)",
                borderRadius: "8px", color: "#a590ff",
                cursor: uploadingAvatar ? "not-allowed" : "pointer",
                fontFamily: "inherit", fontSize: "14px",
                fontWeight: 600, padding: "10px 20px",
                display: "block", marginBottom: "8px",
              }}
            >
              {uploadingAvatar ? "Uploading…" : "Change photo"}
            </button>
            <p style={{ fontSize: "12px", color: "#606080", margin: 0 }}>
              JPG, PNG, or GIF · Max 5 MB
            </p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          style={{ display: "none" }}
          onChange={handleAvatarChange}
        />
      </div>

      {/* Name fields */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div>
          <label style={labelStyle}>First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Your first name"
            style={inputStyle}
            required
          />
        </div>
        <div>
          <label style={labelStyle}>Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Your last name"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Feedback */}
      {saveMsg && (
        <div style={{
          backgroundColor: saveMsg.type === "success"
            ? "rgba(97,255,176,0.08)" : "rgba(255,80,80,0.08)",
          border: `1px solid ${saveMsg.type === "success" ? "rgba(97,255,176,0.25)" : "rgba(255,80,80,0.2)"}`,
          borderRadius: "8px", padding: "12px 16px",
          color: saveMsg.type === "success" ? "#61ffb0" : "#ff8080",
          fontSize: "14px",
        }}>
          {saveMsg.text}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={saving || uploadingAvatar}
          style={{
            backgroundColor: (saving || uploadingAvatar) ? "#4a3a99" : "#7b61ff",
            color: "white", border: "none",
            cursor: (saving || uploadingAvatar) ? "not-allowed" : "pointer",
            fontWeight: 700, fontSize: "15px",
            padding: "14px 28px", borderRadius: "8px",
            fontFamily: "inherit",
            opacity: (saving || uploadingAvatar) ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        <a
          href={backHref}
          style={{ color: "#606080", fontSize: "14px", textDecoration: "none" }}
        >
          ← Back to dashboard
        </a>
      </div>
    </form>
  );
}
