"use client";

import { useEffect, useState, useMemo, useCallback } from "react";

type User = {
  id: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  role_name: string;
  class_name: string | null;
};

type RawConnection = {
  id: number;
  status: string;
  requester: { id: string; first_name: string; last_name: string; avatar: string | null };
  recipient: { id: string; first_name: string; last_name: string; avatar: string | null };
};

type ConnectionMap = Record<string, {
  connectionId: number;
  status: "accepted" | "pending_sent" | "pending_received";
}>;

export default function PeopleDirectory({ myId }: { myId: string }) {
  const [users, setUsers]               = useState<User[]>([]);
  const [connections, setConnections]   = useState<ConnectionMap>({});
  const [pendingIn, setPendingIn]       = useState<RawConnection[]>([]);
  const [search, setSearch]             = useState("");
  const [roleFilter, setRoleFilter]     = useState<"all" | "student" | "teacher">("all");
  const [loading, setLoading]           = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const buildConnectionMap = useCallback((connData: {
    accepted?: RawConnection[];
    pending_sent?: RawConnection[];
    pending_received?: RawConnection[];
  }) => {
    const map: ConnectionMap = {};
    for (const c of connData.accepted ?? []) {
      if (!c.requester?.id || !c.recipient?.id) continue;
      const otherId = c.requester.id === myId ? c.recipient.id : c.requester.id;
      if (otherId) map[otherId] = { connectionId: c.id, status: "accepted" };
    }
    for (const c of connData.pending_sent ?? []) {
      if (!c.recipient?.id) continue;
      map[c.recipient.id] = { connectionId: c.id, status: "pending_sent" };
    }
    for (const c of connData.pending_received ?? []) {
      if (!c.requester?.id) continue;
      map[c.requester.id] = { connectionId: c.id, status: "pending_received" };
    }
    return map;
  }, [myId]);

  const refreshConnections = useCallback(async () => {
    const res = await fetch("/api/portal/connections");
    if (!res.ok) return;
    const connData = await res.json();
    setConnections(buildConnectionMap(connData));
    setPendingIn(connData.pending_received ?? []);
  }, [buildConnectionMap]);

  // Initial load
  useEffect(() => {
    Promise.all([
      fetch("/api/portal/people").then(r => r.json()),
      fetch("/api/portal/connections").then(r => r.json()),
    ]).then(([peopleData, connData]) => {
      setUsers(peopleData.users ?? []);
      setConnections(buildConnectionMap(connData));
      setPendingIn(connData.pending_received ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [buildConnectionMap]);

  // Poll for new requests every 8 seconds
  useEffect(() => {
    const interval = setInterval(refreshConnections, 8000);
    return () => clearInterval(interval);
  }, [refreshConnections]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => {
      if (u.id === myId) return false;
      if (roleFilter !== "all" && u.role_name !== roleFilter) return false;
      if (q) {
        const name = `${u.first_name} ${u.last_name}`.toLowerCase();
        const match = name.includes(q) || u.role_name.includes(q) || (u.class_name?.toLowerCase().includes(q) ?? false);
        if (!match) return false;
      }
      return true;
    });
  }, [users, search, roleFilter, myId]);

  async function sendConnect(userId: string) {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/portal/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient_id: userId }),
      });
      if (res.ok || res.status === 409) {
        const json = await res.json();
        const connId = json.data?.id ?? json.existing?.id;
        setConnections(prev => ({ ...prev, [userId]: { connectionId: connId, status: "pending_sent" } }));
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function cancelRequest(userId: string, connectionId: number) {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/portal/connections/${connectionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConnections(prev => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function respondConnection(userId: string, connectionId: number, action: "accept" | "decline") {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/portal/connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }), // API reads { action }, not { status }
      });
      if (res.ok) {
        if (action === "accept") {
          setConnections(prev => ({ ...prev, [userId]: { connectionId, status: "accepted" } }));
          setPendingIn(prev => prev.filter(c => c.id !== connectionId));
        } else {
          setConnections(prev => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
          setPendingIn(prev => prev.filter(c => c.id !== connectionId));
        }
      }
    } finally {
      setActionLoading(null);
    }
  }

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 16px",
    borderRadius: "100px",
    border: active ? "1px solid rgba(123,97,255,0.5)" : "1px solid rgba(123,97,255,0.15)",
    backgroundColor: active ? "rgba(123,97,255,0.15)" : "transparent",
    color: active ? "#c0b8e8" : "#707090",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  });

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "#707090" }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      {/* ── Pending Requests Section ── */}
      {pendingIn.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            marginBottom: "14px",
          }}>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#f0eeff", margin: 0 }}>
              Connection Requests
            </h2>
            <span style={{
              fontSize: "11px", fontWeight: 700,
              backgroundColor: "rgba(123,97,255,0.2)",
              border: "1px solid rgba(123,97,255,0.4)",
              color: "#a590ff",
              borderRadius: "100px",
              padding: "2px 8px",
            }}>
              {pendingIn.length}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {pendingIn.map(conn => {
              const sender = conn.requester;
              // Guard: skip if requester didn't expand (Directus relations not yet configured)
              if (!sender || typeof sender !== "object") return null;
              const fullName = `${sender.first_name ?? "Member"} ${sender.last_name ?? ""}`.trim();
              const initials = [sender.first_name?.[0], sender.last_name?.[0]]
                .filter(Boolean).join("").toUpperCase() || "?";
              const isLoading = actionLoading === sender.id;

              return (
                <div key={conn.id} style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  backgroundColor: "rgba(123,97,255,0.06)",
                  border: "1px solid rgba(123,97,255,0.2)",
                  borderRadius: "10px",
                  padding: "14px 18px",
                }}>
                  {/* Avatar */}
                  {sender.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/portal/files/${sender.avatar}`}
                      alt={fullName}
                      style={{
                        width: 44, height: 44, borderRadius: "50%",
                        objectFit: "cover", flexShrink: 0,
                        border: "2px solid rgba(123,97,255,0.3)",
                      }}
                    />
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%",
                      backgroundColor: "rgba(123,97,255,0.2)",
                      border: "2px solid rgba(123,97,255,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "15px", fontWeight: 800, color: "#a590ff", flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                  )}

                  {/* Name + label */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#f0eeff" }}>{fullName}</div>
                    <div style={{ fontSize: "12px", color: "#707090", marginTop: "2px" }}>
                      wants to connect with you
                    </div>
                  </div>

                  {/* Accept / Decline */}
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    {isLoading ? (
                      <span style={{ fontSize: "12px", color: "#707090" }}>...</span>
                    ) : (
                      <>
                        <button
                          onClick={() => respondConnection(sender.id, conn.id, "accept")}
                          style={{
                            padding: "7px 16px", borderRadius: "7px",
                            border: "1px solid rgba(97,255,176,0.35)",
                            backgroundColor: "rgba(97,255,176,0.12)", color: "#61ffb0",
                            fontSize: "13px", fontWeight: 700, cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => respondConnection(sender.id, conn.id, "decline")}
                          style={{
                            padding: "7px 14px", borderRadius: "7px",
                            border: "1px solid rgba(255,107,107,0.25)",
                            backgroundColor: "rgba(255,107,107,0.08)", color: "#ff6b6b",
                            fontSize: "13px", fontWeight: 700, cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          Decline
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderBottom: "1px solid rgba(123,97,255,0.1)", marginTop: "28px" }} />
        </div>
      )}

      {/* ── Directory ── */}
      <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#f0eeff", margin: "0 0 16px" }}>
        Directory
      </h2>

      {/* Search bar */}
      <div style={{ marginBottom: "14px" }}>
        <input
          type="text"
          placeholder="Search by name, role, or class..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid rgba(123,97,255,0.2)",
            backgroundColor: "rgba(26,26,46,0.6)",
            color: "#f0eeff",
            fontSize: "14px",
            fontFamily: "inherit",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <button style={pillStyle(roleFilter === "all")} onClick={() => setRoleFilter("all")}>All</button>
        <button style={pillStyle(roleFilter === "student")} onClick={() => setRoleFilter("student")}>Students</button>
        <button style={pillStyle(roleFilter === "teacher")} onClick={() => setRoleFilter("teacher")}>Teachers</button>
      </div>

      {/* User grid */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "48px 24px",
          backgroundColor: "rgba(26,26,46,0.3)",
          border: "1px dashed rgba(123,97,255,0.18)",
          borderRadius: "12px",
          color: "#606080",
          fontSize: "15px",
        }}>
          No people found.
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "12px",
        }}>
          {filtered.map(user => (
            <UserCard
              key={user.id}
              user={user}
              connection={connections[user.id]}
              isLoading={actionLoading === user.id}
              onConnect={() => sendConnect(user.id)}
              onCancel={(connId) => cancelRequest(user.id, connId)}
              onAccept={(connId) => respondConnection(user.id, connId, "accept")}
              onDecline={(connId) => respondConnection(user.id, connId, "decline")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UserCard({
  user,
  connection,
  isLoading,
  onConnect,
  onCancel,
  onAccept,
  onDecline,
}: {
  user: User;
  connection?: ConnectionMap[string];
  isLoading: boolean;
  onConnect: () => void;
  onCancel: (connId: number) => void;
  onAccept: (connId: number) => void;
  onDecline: (connId: number) => void;
}) {
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  const initials = [user.first_name?.[0], user.last_name?.[0]]
    .filter(Boolean).join("").toUpperCase() || "?";

  const isTeacher = user.role_name === "teacher";
  const badgeColor = isTeacher ? "#ffd761" : "#a590ff";

  const btnBase: React.CSSProperties = {
    padding: "5px 14px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      backgroundColor: "rgba(26,26,46,0.6)",
      border: "1px solid rgba(123,97,255,0.12)",
      borderRadius: "10px",
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      gap: "14px",
    }}>
      {/* Avatar */}
      {user.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/portal/files/${user.avatar}`}
          alt={fullName}
          style={{
            width: 48, height: 48, borderRadius: "50%",
            objectFit: "cover", flexShrink: 0,
            border: "2px solid rgba(123,97,255,0.25)",
          }}
        />
      ) : (
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          backgroundColor: "rgba(123,97,255,0.15)",
          border: "2px solid rgba(123,97,255,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "16px", fontWeight: 800, color: "#a590ff", flexShrink: 0,
        }}>
          {initials}
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#f0eeff" }}>{fullName}</span>
          <span style={{
            backgroundColor: `${badgeColor}18`,
            border: `1px solid ${badgeColor}40`,
            borderRadius: "100px",
            padding: "1px 8px",
            fontSize: "11px",
            fontWeight: 600,
            color: badgeColor,
            textTransform: "capitalize",
          }}>
            {user.role_name}
          </span>
        </div>
        {user.class_name && (
          <div style={{ fontSize: "13px", color: "#707090" }}>
            {user.class_name}
          </div>
        )}
      </div>

      {/* Action */}
      <div style={{ flexShrink: 0, display: "flex", gap: "6px", alignItems: "center" }}>
        {isLoading ? (
          <span style={{ fontSize: "12px", color: "#707090" }}>...</span>
        ) : !connection ? (
          <button
            onClick={onConnect}
            style={{
              ...btnBase,
              backgroundColor: "rgba(123,97,255,0.15)",
              color: "#a590ff",
              border: "1px solid rgba(123,97,255,0.3)",
            }}
          >
            Connect
          </button>
        ) : connection.status === "pending_sent" ? (
          <button
            onClick={() => onCancel(connection.connectionId)}
            title="Cancel request"
            style={{
              ...btnBase,
              backgroundColor: "rgba(123,97,255,0.08)",
              color: "#707090",
              border: "1px solid rgba(123,97,255,0.15)",
              cursor: "pointer",
              position: "relative",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,107,107,0.1)";
              (e.currentTarget as HTMLButtonElement).style.color = "#ff6b6b";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,107,107,0.25)";
              (e.currentTarget as HTMLButtonElement).textContent = "Cancel";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(123,97,255,0.08)";
              (e.currentTarget as HTMLButtonElement).style.color = "#707090";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(123,97,255,0.15)";
              (e.currentTarget as HTMLButtonElement).textContent = "Pending";
            }}
          >
            Pending
          </button>
        ) : connection.status === "pending_received" ? (
          <>
            <button
              onClick={() => onAccept(connection.connectionId)}
              style={{
                ...btnBase,
                backgroundColor: "rgba(97,255,176,0.15)",
                color: "#61ffb0",
                border: "1px solid rgba(97,255,176,0.3)",
              }}
            >
              Accept
            </button>
            <button
              onClick={() => onDecline(connection.connectionId)}
              style={{
                ...btnBase,
                backgroundColor: "rgba(255,107,107,0.1)",
                color: "#ff6b6b",
                border: "1px solid rgba(255,107,107,0.25)",
              }}
            >
              Decline
            </button>
          </>
        ) : connection.status === "accepted" ? (
          <a
            href={`/portal/messages/${connection.connectionId}`}
            style={{
              ...btnBase,
              backgroundColor: "rgba(123,97,255,0.15)",
              color: "#a590ff",
              border: "1px solid rgba(123,97,255,0.3)",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Message
          </a>
        ) : null}
      </div>
    </div>
  );
}
