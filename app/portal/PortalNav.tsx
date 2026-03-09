"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type Tab = { label: string; href: string; };

type Props = {
  tabs: Tab[];
  userId: string;
  firstName: string;
  avatarId?: string | null;
  role: string;
  unreadMessages?: number; // kept for backward compat, badge now self-fetches
};

function Avatar({ avatarId, firstName, size = 32 }: { avatarId?: string | null; firstName: string; size?: number }) {
  if (avatarId) {
    return (
      <img
        src={`/api/portal/files/${avatarId}?inline=1`}
        alt={firstName}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      backgroundColor: "rgba(123,97,255,0.25)",
      border: "1px solid rgba(123,97,255,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 700, color: "#a590ff", flexShrink: 0,
    }}>
      {firstName?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function PortalNav({ tabs, userId, firstName, avatarId, role }: Props) {
  const pathname = usePathname();
  const router   = useRouter();
  const [loggingOut, setLoggingOut]   = useState(false);
  const [notifCount, setNotifCount]   = useState(0);
  const [unreadMsgs, setUnreadMsgs]   = useState(0);

  // Self-fetch notification counts every 30 seconds
  useEffect(() => {
    async function fetchCounts() {
      try {
        const res = await fetch("/api/portal/notifications/count");
        if (res.ok) {
          const data = await res.json();
          setNotifCount(data.total ?? 0);
          setUnreadMsgs(data.unread_messages ?? 0);
        }
      } catch { /* silent */ }
    }
    fetchCounts();
    const interval = setInterval(fetchCounts, 30_000);
    return () => clearInterval(interval);
  }, [userId]);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/portal/logout", { method: "POST" });
    router.push("/portal/login");
  }

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50,
      backgroundColor: "rgba(13,13,26,0.95)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(123,97,255,0.12)",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 32px",
      }}>
        <a href="/" style={{ fontSize: "17px", fontWeight: 700, color: "#f0eeff", textDecoration: "none", letterSpacing: "-0.02em" }}>
          Blacksky<span style={{ color: "#7b61ff" }}> Up</span>
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{ fontSize: "13px", color: "#606080" }}>
            {role === "teacher" ? "Teacher" : role === "admin" ? "Admin" : "Student"}
          </span>
          <a href={role === "teacher" ? "/portal/teacher" : role === "admin" ? "/portal/admin" : "/portal/student"} style={{ textDecoration: "none" }}>
            <Avatar avatarId={avatarId} firstName={firstName} size={32} />
          </a>
          <button
            onClick={logout}
            disabled={loggingOut}
            style={{
              background: "none", border: "1px solid rgba(123,97,255,0.2)",
              borderRadius: "6px", padding: "6px 14px",
              color: "#7070a0", fontSize: "12px", cursor: "pointer",
            }}
          >
            {loggingOut ? "…" : "Sign out"}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex", gap: "0", paddingLeft: "32px",
        borderTop: "1px solid rgba(123,97,255,0.08)",
      }}>
        {tabs.map((tab) => {
          const active    = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
          const isMsgs    = tab.label === "Messages";
          const isNotifs  = tab.label === "Notifications";
          const badge     = isMsgs ? unreadMsgs : isNotifs ? notifCount : 0;

          return (
            <a
              key={tab.href}
              href={tab.href}
              style={{
                padding: "12px 20px",
                fontSize: "13px", fontWeight: active ? 700 : 500,
                color: active ? "#c0b0ff" : "#7070a0",
                textDecoration: "none",
                borderBottom: active ? "2px solid #7b61ff" : "2px solid transparent",
                transition: "color 0.15s, border-color 0.15s",
                position: "relative",
                display: "flex", alignItems: "center", gap: "6px",
              }}
            >
              {tab.label}
              {badge > 0 && (
                <span style={{
                  backgroundColor: isNotifs ? "#ff6b6b" : "#7b61ff",
                  color: "white", fontSize: "10px", fontWeight: 700,
                  borderRadius: "100px", padding: "1px 6px",
                  lineHeight: "16px",
                }}>
                  {badge}
                </span>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
