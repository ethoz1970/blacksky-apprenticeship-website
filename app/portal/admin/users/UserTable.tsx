"use client";

import { useState, useEffect, useCallback } from "react";

type UserRow = {
  id: string;
  first_name: string;
  last_name?: string;
  email: string;
  status: string;
  role: { id: string; name: string } | null;
  avatar?: string | null;
  last_access?: string | null;
  date_created?: string;
};

type Props = {
  initialTab: string;
  roleMap: Record<string, string>; // roleName → roleId (from server, used as fallback)
};


function timeAgo(iso?: string | null) {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Avatar({ avatarId, name, size = 36 }: { avatarId?: string | null; name: string; size?: number }) {
  if (avatarId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/api/portal/files/${avatarId}?inline=1`} alt={name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      backgroundColor: "rgba(123,97,255,0.2)", border: "1px solid rgba(123,97,255,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#a590ff", flexShrink: 0,
    }}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function UserTable({ initialTab, roleMap: initialRoleMap }: Props) {
  const [tab, setTab]             = useState(initialTab);
  const [users, setUsers]         = useState<UserRow[]>([]);
  const [roleMap, setRoleMap]     = useState<Record<string, string>>(initialRoleMap);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [error, setError]         = useState<string | null>(null);

  const loadUsers = useCallback(async (role: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/admin/users?role=${role}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `Request failed (${res.status})`);
        setUsers([]);
      } else {
        const json = await res.json();
        setUsers(json.data ?? []);
        if (json.roleMap) setRoleMap(json.roleMap);
      }
    } catch (e) {
      setError("Network error — could not load users.");
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(tab); }, [tab, loadUsers]);

  async function updateUser(userId: string, patch: Record<string, unknown>) {
    setSaving(userId);
    try {
      const res = await fetch("/api/portal/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...patch }),
      });
      if (res.ok) {
        await loadUsers(tab);
        // Keep the row expanded after save
      } else {
        const j = await res.json().catch(() => ({}));
        alert(`Failed to update: ${j.error ?? res.status}`);
      }
    } catch {
      alert("Network error — could not save.");
    }
    setSaving(null);
  }

  async function promoteToStudent(userId: string) {
    const id = roleMap["student"];
    if (!id) return alert("Student role not found. Check Directus roles.");
    await updateUser(userId, { role_id: id });
  }

  const roleBadgeColor: Record<string, string> = {
    student: "#61d4ff", teacher: "#61ffb0", applicant: "#ffd761",
    administrator: "#ff6b6b", admin: "#ff6b6b",
  };

  const TABS = [
    { key: "all",       label: "All Users" },
    { key: "student",   label: "Students" },
    { key: "teacher",   label: "Teachers" },
    { key: "applicant", label: "Applicants" },
  ];

  const filtered = users.filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  // Editable roles (exclude Directus system roles)
  const editableRoles = Object.keys(roleMap).filter(r => !["public"].includes(r));

  return (
    <div>
      {/* Tab bar + search */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setExpandedUser(null); }}
              style={{
                padding: "7px 16px", borderRadius: "100px", fontSize: "13px", fontWeight: 600,
                cursor: "pointer", border: "none",
                backgroundColor: tab === t.key ? "rgba(123,97,255,0.2)" : "rgba(123,97,255,0.06)",
                color: tab === t.key ? "#c0b0ff" : "#707090",
                outline: tab === t.key ? "1px solid rgba(123,97,255,0.5)" : "1px solid rgba(123,97,255,0.1)",
              }}>
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text" placeholder="Search by name or email…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            padding: "8px 14px", borderRadius: "8px", fontSize: "13px",
            backgroundColor: "rgba(123,97,255,0.06)", border: "1px solid rgba(123,97,255,0.18)",
            color: "#f0eeff", outline: "none", minWidth: "220px",
          }}
        />
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          marginBottom: "16px", padding: "12px 16px", borderRadius: "8px",
          backgroundColor: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)",
          color: "#ff6b6b", fontSize: "13px",
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Table */}
      <div style={{
        backgroundColor: "rgba(26,26,46,0.7)",
        border: "1px solid rgba(123,97,255,0.12)",
        borderRadius: "12px", overflow: "hidden",
      }}>
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center" }}>
            <p style={{ color: "#606080" }}>Loading users…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center" }}>
            <p style={{ color: "#606080" }}>No users found.</p>
          </div>
        ) : (
          filtered.map((user, i) => {
            const isExpanded = expandedUser === user.id;
            const isSaving   = saving === user.id;
            const roleName   = user.role?.name?.toLowerCase() ?? "unknown";
            const badgeColor = roleBadgeColor[roleName] ?? "#7070a0";
            const fullName = `${user.first_name} ${user.last_name ?? ""}`.trim();

            return (
              <div key={user.id}>
                {/* Row */}
                <div onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "14px 20px",
                    borderBottom: i < filtered.length - 1 || isExpanded ? "1px solid rgba(123,97,255,0.07)" : "none",
                    cursor: "pointer",
                    backgroundColor: isExpanded ? "rgba(123,97,255,0.05)" : "transparent",
                  }}>
                  <Avatar avatarId={user.avatar} name={user.first_name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#e0d8ff" }}>{fullName}</span>
                      <span style={{
                        fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px",
                        backgroundColor: `${badgeColor}18`, border: `1px solid ${badgeColor}35`,
                        color: badgeColor, textTransform: "capitalize",
                      }}>
                        {roleName}
                      </span>
                      {user.status === "suspended" && (
                        <span style={{
                          fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px",
                          backgroundColor: "rgba(255,107,107,0.12)", border: "1px solid rgba(255,107,107,0.3)", color: "#ff6b6b",
                        }}>Suspended</span>
                      )}
                    </div>
                    <p style={{ fontSize: "12px", color: "#606080", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.email}
                    </p>
                  </div>
                  <p style={{ fontSize: "11px", color: "#505068", flexShrink: 0 }}>{timeAgo(user.last_access)}</p>
                  <span style={{ color: "#505068", fontSize: "12px" }}>{isExpanded ? "▲" : "▼"}</span>
                </div>

                {/* Expanded actions */}
                {isExpanded && (
                  <div style={{
                    padding: "16px 20px 20px 70px",
                    backgroundColor: "rgba(13,13,26,0.4)",
                    borderBottom: i < filtered.length - 1 ? "1px solid rgba(123,97,255,0.07)" : "none",
                    display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "flex-end",
                  }}>

                    {/* Role — controlled select, value reflects live data */}
                    <div>
                      <label style={{ fontSize: "11px", color: "#606080", fontWeight: 600, display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Role
                      </label>
                      <select
                        value={roleName}
                        disabled={isSaving}
                        onChange={e => {
                          const newRole = e.target.value;
                          const roleId  = roleMap[newRole];
                          if (roleId) updateUser(user.id, { role_id: roleId });
                        }}
                        style={{
                          padding: "7px 12px", borderRadius: "8px", fontSize: "13px",
                          backgroundColor: "rgba(123,97,255,0.08)", border: "1px solid rgba(123,97,255,0.22)",
                          color: "#e0d8ff", cursor: "pointer",
                        }}
                      >
                        {editableRoles.map(r => (
                          <option key={r} value={r} style={{ backgroundColor: "#1a1a2e" }}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                        {/* If current role isn't in the map, add it as a read-only option */}
                        {roleName !== "unknown" && !editableRoles.includes(roleName) && (
                          <option value={roleName} style={{ backgroundColor: "#1a1a2e" }}>
                            {roleName.charAt(0).toUpperCase() + roleName.slice(1)}
                          </option>
                        )}
                      </select>
                    </div>

                    {/* Quick approve for applicants */}
                    {roleName === "applicant" && (
                      <button
                        onClick={() => promoteToStudent(user.id)}
                        disabled={isSaving}
                        style={{
                          padding: "8px 18px", borderRadius: "8px", border: "none",
                          backgroundColor: "rgba(97,212,255,0.15)", color: "#61d4ff",
                          fontSize: "13px", fontWeight: 700, cursor: isSaving ? "not-allowed" : "pointer",
                          outline: "1px solid rgba(97,212,255,0.3)",
                        }}
                      >
                        {isSaving ? "Saving…" : "✓ Approve as Student"}
                      </button>
                    )}

                    {/* Suspend / Activate */}
                    <div style={{ marginLeft: "auto" }}>
                      {user.status === "active" || user.status === "invited" ? (
                        <button
                          onClick={() => {
                            if (confirm("Suspend this user? They won't be able to log in."))
                              updateUser(user.id, { status: "suspended" });
                          }}
                          disabled={isSaving}
                          style={{
                            padding: "7px 16px", borderRadius: "8px",
                            border: "1px solid rgba(255,107,107,0.25)",
                            backgroundColor: "rgba(255,107,107,0.08)", color: "#ff6b6b",
                            fontSize: "12px", fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          {isSaving ? "…" : "Suspend"}
                        </button>
                      ) : (
                        <button
                          onClick={() => updateUser(user.id, { status: "active" })}
                          disabled={isSaving}
                          style={{
                            padding: "7px 16px", borderRadius: "8px",
                            border: "1px solid rgba(97,255,176,0.25)",
                            backgroundColor: "rgba(97,255,176,0.08)", color: "#61ffb0",
                            fontSize: "12px", fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          {isSaving ? "…" : "Activate"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <p style={{ fontSize: "12px", color: "#505068", marginTop: "12px", textAlign: "right" }}>
        {filtered.length} user{filtered.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
