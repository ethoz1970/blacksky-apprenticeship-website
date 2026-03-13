"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

type Tab = { label: string; href: string; };

type Props = {
  tabs: Tab[];
  userId: string;
  firstName: string;
  avatarId?: string | null;
  role: string;
  unreadMessages?: number; // kept for backward compat, ignored
};

function AvatarImg({ avatarId, firstName, size = 34 }: { avatarId?: string | null; firstName: string; size?: number }) {
  if (avatarId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
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
      fontSize: size * 0.38, fontWeight: 700, color: "#a590ff", flexShrink: 0,
    }}>
      {firstName?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function PortalNav({ tabs, userId, firstName, avatarId, role }: Props) {
  const pathname = usePathname();
  const router   = useRouter();

  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Close menu on navigation
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  async function logout() {
    setLoggingOut(true);
    setMenuOpen(false);
    await fetch("/api/portal/logout", { method: "POST" });
    router.push("/portal/login");
  }

  const dashHref = role === "teacher" ? "/portal/teacher"
    : role === "admin" ? "/portal/admin"
    : "/portal/student";

  const roleLabel = role === "teacher" ? "Teacher"
    : role === "admin" ? "Admin"
    : "Student";

  const totalBadge = notifCount + unreadMsgs;

  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50,
      backgroundColor: "rgba(13,13,26,0.95)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(123,97,255,0.12)",
    }}>
      {/* ── Top bar ───────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 32px",
      }}>
        <a href="/" style={{ fontSize: "17px", fontWeight: 700, color: "#f0eeff", textDecoration: "none", letterSpacing: "-0.02em" }}>
          Blacksky<span style={{ color: "#7b61ff" }}> Up</span>
        </a>

        {/* Avatar button + dropdown */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 0,
              display: "flex", alignItems: "center", gap: "8px", position: "relative",
            }}
            aria-label="Account menu"
          >
            <AvatarImg avatarId={avatarId} firstName={firstName} size={34} />
            {/* Total badge on avatar */}
            {totalBadge > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -4,
                backgroundColor: "#ff6b6b", color: "white",
                fontSize: "9px", fontWeight: 800,
                borderRadius: "100px", padding: "1px 5px",
                lineHeight: "14px", border: "2px solid rgba(13,13,26,0.95)",
                pointerEvents: "none",
              }}>
                {totalBadge > 99 ? "99+" : totalBadge}
              </span>
            )}
          </button>

          {/* ── Dropdown menu ─────────────────────────────────── */}
          {menuOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 10px)", right: 0,
              width: "220px",
              backgroundColor: "#141428",
              border: "1px solid rgba(123,97,255,0.2)",
              borderRadius: "12px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
              overflow: "hidden",
              zIndex: 100,
            }}>
              {/* User info header */}
              <div style={{
                padding: "14px 16px 12px",
                borderBottom: "1px solid rgba(123,97,255,0.1)",
                display: "flex", alignItems: "center", gap: "10px",
              }}>
                <AvatarImg avatarId={avatarId} firstName={firstName} size={36} />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#f0eeff" }}>{firstName}</div>
                  <div style={{ fontSize: "11px", color: "#7b61ff", fontWeight: 600, textTransform: "capitalize" }}>{roleLabel}</div>
                </div>
              </div>

              {/* Menu items */}
              <div style={{ padding: "6px 0" }}>

                {/* Dashboard */}
                <MenuItem href={dashHref} label="Dashboard" icon="⊞" />

                {/* Messages */}
                <MenuItem
                  href="/portal/messages"
                  label="Messages"
                  icon="✉"
                  badge={unreadMsgs}
                  badgeColor="#7b61ff"
                />

                {/* Notifications */}
                <MenuItem
                  href="/portal/notifications"
                  label="Notifications"
                  icon="🔔"
                  badge={notifCount}
                  badgeColor="#ff6b6b"
                />

                {/* Profile */}
                <MenuItem href="/portal/profile" label="Profile" icon="◎" />

                {/* Divider */}
                <div style={{ height: "1px", backgroundColor: "rgba(123,97,255,0.1)", margin: "6px 0" }} />

                {/* Sign out */}
                <button
                  onClick={logout}
                  disabled={loggingOut}
                  style={{
                    width: "100%", background: "none", border: "none",
                    cursor: loggingOut ? "not-allowed" : "pointer",
                    padding: "10px 16px",
                    display: "flex", alignItems: "center", gap: "10px",
                    fontSize: "14px", color: "#ff6b6b",
                    fontFamily: "inherit", textAlign: "left",
                    opacity: loggingOut ? 0.5 : 1,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,107,107,0.07)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <span style={{ fontSize: "14px", width: "18px", textAlign: "center" }}>→</span>
                  {loggingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────── */}
      <div style={{
        display: "flex", paddingLeft: "32px",
        borderTop: "1px solid rgba(123,97,255,0.08)",
      }}>
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
          return (
            <a
              key={tab.href}
              href={tab.href}
              style={{
                padding: "11px 20px",
                fontSize: "13px", fontWeight: active ? 700 : 500,
                color: active ? "#c0b0ff" : "#7070a0",
                textDecoration: "none",
                borderBottom: active ? "2px solid #7b61ff" : "2px solid transparent",
                transition: "color 0.15s, border-color 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function MenuItem({
  href, label, icon, badge, badgeColor,
}: {
  href: string;
  label: string;
  icon: string;
  badge?: number;
  badgeColor?: string;
}) {
  return (
    <a
      href={href}
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "10px 16px",
        fontSize: "14px", color: "#c0b8e8",
        textDecoration: "none",
        transition: "background 0.1s",
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(123,97,255,0.08)")}
      onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent")}
    >
      <span style={{ fontSize: "14px", width: "18px", textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && badge > 0 && (
        <span style={{
          backgroundColor: badgeColor ?? "#7b61ff",
          color: "white", fontSize: "10px", fontWeight: 700,
          borderRadius: "100px", padding: "1px 7px",
          lineHeight: "16px", flexShrink: 0,
        }}>
          {badge}
        </span>
      )}
    </a>
  );
}
