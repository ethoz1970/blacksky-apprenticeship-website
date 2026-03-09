"use client";

import { useEffect, useState, useMemo } from "react";

type User = {
  id: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  role_name: string;
  class_name: string | null;
};

type Connection = {
  id: number;
  status: string;
  requester: { id: string };
  recipient: { id: string };
};

type ConnectionMap = Record<string, {
  connectionId: number;
  status: "accepted" | "pending_sent" | "pending_received";
}>;

export default function PeopleDirectory({ myId }: { myId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [connections, setConnections] = useState<ConnectionMap>({});
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "teacher">("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/portal/people").then(r => r.json()),
      fetch("/api/portal/connections").then(r => r.json()),
    ]).then(([peopleData, connData]) => {
      setUsers(peopleData.users ?? []);

      // Build connection map: userId -> { connectionId, status }
      const map: ConnectionMap = {};
      for (const c of connData.accepted ?? []) {
        const otherId = c.requester.id === myId ? c.recipient.id : c.requester.id;
        map[otherId] = { connectionId: c.id, status: "accepted" };
      }
      for (const c of connData.pending_sent ?? []) {
        map[c.recipient.id] = { connectionId: c.id, status: "pending_sent" };
      }
      for (const c of connData.pending_received ?? []) {
        map[c.requester.id] = { connectionId: c.id, status: "pending_received" };
      }
      setConnections(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [myId]);

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

  async function respondConnection(userId: string, connectionId: number, action: "accept" | "decline") {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/portal/connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action === "accept" ? "accepted" : "declined" }),
      });
      if (res.ok) {
        setConnections(prev => ({
          ...prev,
          [userId]: action === "accept"
            ? { connectionId, status: "accepted" }
            : { connectionId, status: "pending_received" }, // remove on decline
        }));
        if (action === "decline") {
          setConnections(prev => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
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
      {/* Search bar */}
      <div style={{ marginBottom: "20px" }}>
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
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
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
  onAccept,
  onDecline,
}: {
  user: User;
  connection?: ConnectionMap[string];
  isLoading: boolean;
  onConnect: () => void;
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
          <span style={{
            ...btnBase,
            backgroundColor: "rgba(123,97,255,0.08)",
            color: "#606080",
            cursor: "default",
          }}>
            Pending
          </span>
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
