"use client";

import { useEffect, useState, useCallback } from "react";

type ConnUser = {
  id: string;
  first_name: string;
  last_name?: string;
  avatar?: string | null;
  role?: { name: string } | null;
};

type RawConnection = {
  id: number;
  date_created: string;
  requester: ConnUser;
  recipient: ConnUser;
};

type Conversation = {
  connectionId: number;
  other: {
    id: string;
    first_name: string;
    last_name?: string;
    avatar?: string | null;
  };
  lastMessage: { content: string; date_created: string } | null;
  unread: number;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function UserAvatar({ avatarId, name, size = 40 }: { avatarId?: string | null; name: string; size?: number }) {
  if (avatarId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/portal/files/${avatarId}?inline=1`}
        alt={name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid rgba(123,97,255,0.25)" }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      backgroundColor: "rgba(123,97,255,0.18)", border: "2px solid rgba(123,97,255,0.28)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#a590ff", flexShrink: 0,
    }}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function NotificationsFeed({ myId }: { myId: string }) {
  const [requests, setRequests]         = useState<RawConnection[]>([]);
  const [sentRequests, setSentRequests] = useState<RawConnection[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [cancelLoading, setCancelLoading] = useState<number | null>(null);
  const [loading, setLoading]           = useState(true);

  const load = useCallback(async () => {
    // Fetch connections and messages independently so one failure can't blank the page
    const loadConnections = async () => {
      try {
        const res = await fetch("/api/portal/connections");
        if (!res.ok) return;
        const data = await res.json();
        setRequests(data.pending_received ?? []);
        setSentRequests(data.pending_sent ?? []);
      } catch (e) {
        console.error("[notifications] connections error:", e);
      }
    };

    const loadMessages = async () => {
      try {
        const res = await fetch("/api/portal/messages");
        if (!res.ok) return;
        const data = await res.json();
        const unread = (data.conversations ?? []).filter((c: Conversation) => c.unread > 0);
        setConversations(unread);
      } catch (e) {
        console.error("[notifications] messages error:", e);
      }
    };

    await Promise.all([loadConnections(), loadMessages()]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll every 10 seconds
  useEffect(() => {
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  async function respond(connectionId: number, action: "accept" | "decline") {
    setActionLoading(connectionId);
    try {
      const res = await fetch(`/api/portal/connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== connectionId));
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function cancelSent(connectionId: number) {
    setCancelLoading(connectionId);
    try {
      const res = await fetch(`/api/portal/connections/${connectionId}`, { method: "DELETE" });
      if (res.ok) {
        setSentRequests(prev => prev.filter(r => r.id !== connectionId));
      }
    } finally {
      setCancelLoading(null);
    }
  }

  const totalCount = requests.length + sentRequests.length + conversations.length;

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "#606080" }}>
        Loading notifications…
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div style={{
        textAlign: "center", padding: "80px 24px",
        backgroundColor: "rgba(26,26,46,0.3)",
        border: "1px dashed rgba(123,97,255,0.18)",
        borderRadius: "14px",
      }}>
        <div style={{ fontSize: "40px", marginBottom: "16px" }}>🔔</div>
        <p style={{ color: "#606080", fontSize: "16px", margin: 0 }}>
          You're all caught up — no new notifications.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

      {/* ── Connection Requests ── */}
      {requests.length > 0 && (
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#a590ff", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Connection Requests
            </h2>
            <span style={{
              fontSize: "11px", fontWeight: 700,
              backgroundColor: "rgba(123,97,255,0.2)", border: "1px solid rgba(123,97,255,0.4)",
              color: "#a590ff", borderRadius: "100px", padding: "2px 8px",
            }}>
              {requests.length}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {requests.map(conn => {
              const sender = conn.requester;
              // Guard: skip if requester didn't expand (Directus relations not yet configured)
              if (!sender || typeof sender !== "object") return null;
              const fullName = `${sender.first_name ?? "Member"} ${sender.last_name ?? ""}`.trim();
              const isActing = actionLoading === conn.id;
              const roleName = sender.role?.name?.toLowerCase() ?? "";
              const badgeColor = roleName === "teacher" ? "#ffd761" : "#a590ff";

              return (
                <div key={conn.id} style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  backgroundColor: "rgba(123,97,255,0.05)",
                  border: "1px solid rgba(123,97,255,0.18)",
                  borderRadius: "12px", padding: "16px 20px",
                }}>
                  <UserAvatar avatarId={sender.avatar} name={sender.first_name} size={44} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "15px", fontWeight: 700, color: "#f0eeff" }}>{fullName}</span>
                      {roleName && (
                        <span style={{
                          fontSize: "10px", fontWeight: 600, padding: "1px 7px", borderRadius: "100px",
                          backgroundColor: `${badgeColor}18`, border: `1px solid ${badgeColor}35`,
                          color: badgeColor, textTransform: "capitalize",
                        }}>
                          {roleName}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "13px", color: "#707090", margin: 0 }}>
                      Wants to connect with you · {timeAgo(conn.date_created)}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    {isActing ? (
                      <span style={{ fontSize: "13px", color: "#606080" }}>…</span>
                    ) : (
                      <>
                        <button
                          onClick={() => respond(conn.id, "accept")}
                          style={{
                            padding: "8px 18px", borderRadius: "8px", border: "1px solid rgba(97,255,176,0.35)",
                            backgroundColor: "rgba(97,255,176,0.12)", color: "#61ffb0",
                            fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => respond(conn.id, "decline")}
                          style={{
                            padding: "8px 14px", borderRadius: "8px", border: "1px solid rgba(255,107,107,0.25)",
                            backgroundColor: "rgba(255,107,107,0.08)", color: "#ff6b6b",
                            fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
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
        </section>
      )}

      {/* ── Sent Requests (awaiting response) ── */}
      {sentRequests.length > 0 && (
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#707090", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Sent Requests
            </h2>
            <span style={{
              fontSize: "11px", fontWeight: 700,
              backgroundColor: "rgba(112,112,144,0.15)", border: "1px solid rgba(112,112,144,0.3)",
              color: "#909090", borderRadius: "100px", padding: "2px 8px",
            }}>
              {sentRequests.length}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {sentRequests.map(conn => {
              const other = conn.recipient;
              // Guard: skip if recipient didn't expand
              if (!other || typeof other !== "object") return null;
              const fullName = `${other.first_name ?? "Member"} ${other.last_name ?? ""}`.trim();
              const isCancelling = cancelLoading === conn.id;

              return (
                <div key={conn.id} style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  backgroundColor: "rgba(26,26,46,0.5)",
                  border: "1px solid rgba(123,97,255,0.1)",
                  borderRadius: "12px", padding: "16px 20px",
                }}>
                  <UserAvatar avatarId={other.avatar} name={other.first_name} size={44} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#c0b8e8" }}>{fullName}</span>
                    <p style={{ fontSize: "13px", color: "#505068", margin: "3px 0 0" }}>
                      Request pending · {conn.date_created ? timeAgo(conn.date_created) : ""}
                    </p>
                  </div>

                  <button
                    onClick={() => cancelSent(conn.id)}
                    disabled={isCancelling}
                    title="Cancel request"
                    style={{
                      padding: "7px 14px", borderRadius: "7px", cursor: "pointer",
                      border: "1px solid rgba(255,107,107,0.2)",
                      backgroundColor: "rgba(255,107,107,0.07)", color: "#ff6b6b",
                      fontSize: "12px", fontWeight: 600, fontFamily: "inherit",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,107,107,0.15)")}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,107,107,0.07)")}
                  >
                    {isCancelling ? "…" : "Cancel"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Unread Messages ── */}
      {conversations.length > 0 && (
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#a590ff", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Unread Messages
            </h2>
            <span style={{
              fontSize: "11px", fontWeight: 700,
              backgroundColor: "rgba(123,97,255,0.2)", border: "1px solid rgba(123,97,255,0.4)",
              color: "#a590ff", borderRadius: "100px", padding: "2px 8px",
            }}>
              {conversations.reduce((sum, c) => sum + c.unread, 0)}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {conversations.map(conv => {
              if (!conv.other?.first_name) return null;
              const fullName = `${conv.other.first_name} ${conv.other.last_name ?? ""}`.trim();
              return (
                <a
                  key={conv.connectionId}
                  href={`/portal/messages/${conv.connectionId}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    backgroundColor: "rgba(26,26,46,0.6)",
                    border: "1px solid rgba(123,97,255,0.12)",
                    borderRadius: "12px", padding: "16px 20px",
                    cursor: "pointer", transition: "border-color 0.15s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(123,97,255,0.35)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(123,97,255,0.12)")}
                  >
                    <UserAvatar avatarId={conv.other.avatar} name={conv.other.first_name} size={44} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "15px", fontWeight: 700, color: "#f0eeff" }}>{fullName}</span>
                        <span style={{ fontSize: "12px", color: "#505068", flexShrink: 0, marginLeft: "12px" }}>
                          {conv.lastMessage ? timeAgo(conv.lastMessage.date_created) : ""}
                        </span>
                      </div>
                      <p style={{
                        fontSize: "13px", color: "#a0a0c0", margin: 0,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {conv.lastMessage?.content ?? "No messages yet"}
                      </p>
                    </div>

                    {conv.unread > 0 && (
                      <span style={{
                        backgroundColor: "#7b61ff", color: "white",
                        fontSize: "11px", fontWeight: 700,
                        borderRadius: "100px", padding: "2px 8px",
                        flexShrink: 0, marginLeft: "8px",
                      }}>
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
