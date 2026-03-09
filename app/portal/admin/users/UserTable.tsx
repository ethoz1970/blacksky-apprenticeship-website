"use client";

import { useState, useEffect } from "react";

type UserRow = {
  id: string;
  first_name: string;
  last_name?: string;
  email: string;
  status: string;
  role: { id: string; name: string };
  avatar?: string | null;
  class_id?: number | null;
  last_access?: string | null;
  date_created?: string;
};

type ClassOption = { id: number; name: string; discipline: string };

type Props = {
  initialTab: string;
  roleMap: Record<string, string>; // roleName → roleId
  classes: ClassOption[];
};

const DISCIPLINE_COLORS: Record<string, string> = {
  media: "#ff6b6b", tech: "#7b61ff", business: "#61d4ff", arts: "#ffd761",
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

export default function UserTable({ initialTab, roleMap, classes }: Props) {
  const [tab, setTab] = useState(initialTab);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // userId being saved
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function loadUsers(role: string) {
    setLoading(true);
    const res = await fetch(`/api/portal/admin/users?role=${role}`);
    if (res.ok) {
      const { data } = await res.json();
      setUsers(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { loadUsers(tab); }, [tab]);

  async function updateUser(userId: string, patch: Record<string, unknown>) {
    setSaving(userId);
    const res = await fetch("/api/portal/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...patch }),
    });
    if (res.ok) {
      await loadUsers(tab);
    } else {
      alert("Failed to update user. Please try again.");
    }
    setSaving(null);
  }

  async function promoteToStudent(userId: string) {
    if (!roleMap["student"]) return alert("Student role ID not found.");
    await updateUser(userId, { role_id: roleMap["student"] });
  }

  async function assignClass(userId: string, classId: number | null) {
    await updateUser(userId, { class_id: classId });
  }

  async function changeRole(userId: string, roleName: string) {
    const roleId = roleMap[roleName];
    if (!roleId) return;
    await updateUser(userId, { role_id: roleId });
  }

  async function deactivateUser(userId: string) {
    if (!confirm("Deactivate this user? They won't be able to log in.")) return;
    await updateUser(userId, { status: "suspended" });
  }

  async function activateUser(userId: string) {
    await updateUser(userId, { status: "active" });
  }

  const tabs = [
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

  const roleBadgeColor: Record<string, string> = {
    student: "#61d4ff", teacher: "#61ffb0", applicant: "#ffd761",
    administrator: "#ff6b6b", admin: "#ff6b6b",
  };

  return (
    <div>
      {/* Tab bar + search */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "7px 16px", borderRadius: "100px", fontSize: "13px", fontWeight: 600,
                cursor: "pointer", border: "none",
                backgroundColor: tab === t.key ? "rgba(123,97,255,0.2)" : "rgba(123,97,255,0.06)",
                color: tab === t.key ? "#c0b0ff" : "#707090",
                outline: tab === t.key ? "1px solid rgba(123,97,255,0.5)" : "1px solid rgba(123,97,255,0.1)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: "8px 14px", borderRadius: "8px", fontSize: "13px",
            backgroundColor: "rgba(123,97,255,0.06)", border: "1px solid rgba(123,97,255,0.18)",
            color: "#f0eeff", outline: "none", minWidth: "220px",
          }}
        />
      </div>

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
            const currentClass = classes.find(c => c.id === user.class_id);
            const fullName = `${user.first_name} ${user.last_name ?? ""}`.trim();

            return (
              <div key={user.id}>
                {/* Main row */}
                <div
                  onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "14px 20px",
                    borderBottom: isExpanded || i < filtered.length - 1 ? "1px solid rgba(123,97,255,0.07)" : "none",
                    cursor: "pointer",
                    backgroundColor: isExpanded ? "rgba(123,97,255,0.05)" : "transparent",
                    transition: "background 0.12s",
                  }}
                >
                  <Avatar avatarId={user.avatar} name={user.first_name} size={36} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#e0d8ff" }}>{fullName}</span>
                      <span style={{
                        fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px",
                        backgroundColor: `${badgeColor}18`, border: `1px solid ${badgeColor}35`, color: badgeColor,
                        textTransform: "capitalize",
                      }}>
                        {roleName}
                      </span>
                      {user.status === "suspended" && (
                        <span style={{
                          fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px",
                          backgroundColor: "rgba(255,107,107,0.12)", border: "1px solid rgba(255,107,107,0.3)", color: "#ff6b6b",
                        }}>
                          Suspended
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "12px", color: "#606080", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.email}
                      {currentClass && <span style={{ marginLeft: "10px", color: DISCIPLINE_COLORS[currentClass.discipline] ?? "#7b61ff" }}>• {currentClass.name}</span>}
                    </p>
                  </div>

                  <p style={{ fontSize: "11px", color: "#505068", flexShrink: 0 }}>
                    {timeAgo(user.last_access)}
                  </p>
                  <span style={{ color: "#505068", fontSize: "12px" }}>{isExpanded ? "▲" : "▼"}</span>
                </div>

                {/* Expanded actions */}
                {isExpanded && (
                  <div style={{
                    padding: "16px 20px 20px 70px",
                    backgroundColor: "rgba(13,13,26,0.4)",
                    borderBottom: i < filtered.length - 1 ? "1px solid rgba(123,97,255,0.07)" : "none",
                    display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-start",
                  }}>

                    {/* Role change */}
                    <div>
                      <label style={{ fontSize: "11px", color: "#606080", fontWeight: 600, display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Role
                      </label>
                      <select
                        defaultValue={roleName}
                        disabled={isSaving}
                        onChange={e => changeRole(user.id, e.target.value)}
                        style={{
                          padding: "7px 12px", borderRadius: "8px", fontSize: "13px",
                          backgroundColor: "rgba(123,97,255,0.08)", border: "1px solid rgba(123,97,255,0.22)",
                          color: "#e0d8ff", cursor: "pointer",
                        }}
                      >
                        {Object.keys(roleMap).map(r => (
                          <option key={r} value={r} style={{ backgroundColor: "#1a1a2e" }}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Class assignment (students only) */}
                    {(roleName === "student" || roleName === "applicant") && (
                      <div>
                        <label style={{ fontSize: "11px", color: "#606080", fontWeight: 600, display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Assigned Class
                        </label>
                        <select
                          defaultValue={user.class_id ?? ""}
                          disabled={isSaving}
                          onChange={e => assignClass(user.id, e.target.value ? parseInt(e.target.value) : null)}
                          style={{
                            padding: "7px 12px", borderRadius: "8px", fontSize: "13px",
                            backgroundColor: "rgba(123,97,255,0.08)", border: "1px solid rgba(123,97,255,0.22)",
                            color: "#e0d8ff", cursor: "pointer", minWidth: "200px",
                          }}
                        >
                          <option value="" style={{ backgroundColor: "#1a1a2e" }}>— No class —</option>
                          {classes.map(c => (
                            <option key={c.id} value={c.id} style={{ backgroundColor: "#1a1a2e" }}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Quick promote: Applicant → Student */}
                    {roleName === "applicant" && (
                      <div style={{ alignSelf: "flex-end" }}>
                        <button
                          onClick={() => promoteToStudent(user.id)}
                          disabled={isSaving}
                          style={{
                            padding: "8px 18px", borderRadius: "8px", border: "none",
                            backgroundColor: "rgba(97,212,255,0.15)", color: "#61d4ff",
                            fontSize: "13px", fontWeight: 700, cursor: "pointer",
                            outline: "1px solid rgba(97,212,255,0.3)",
                          }}
                        >
                          {isSaving ? "Updating…" : "✓ Approve as Student"}
                        </button>
                      </div>
                    )}

                    {/* Suspend / Activate */}
                    <div style={{ alignSelf: "flex-end", marginLeft: "auto" }}>
                      {user.status === "active" ? (
                        <button
                          onClick={() => deactivateUser(user.id)}
                          disabled={isSaving}
                          style={{
                            padding: "7px 16px", borderRadius: "8px", border: "1px solid rgba(255,107,107,0.25)",
                            backgroundColor: "rgba(255,107,107,0.08)", color: "#ff6b6b",
                            fontSize: "12px", fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => activateUser(user.id)}
                          disabled={isSaving}
                          style={{
                            padding: "7px 16px", borderRadius: "8px", border: "1px solid rgba(97,255,176,0.25)",
                            backgroundColor: "rgba(97,255,176,0.08)", color: "#61ffb0",
                            fontSize: "12px", fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          Activate
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
