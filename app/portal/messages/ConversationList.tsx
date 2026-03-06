"use client";

import { useEffect, useState, useCallback } from "react";

type Conversation = {
  connection_id: number;
  other_user: {
    id: string;
    first_name: string;
    last_name?: string;
    avatar?: string | null;
  };
  last_message?: {
    content: string;
    date_created: string;
    sender_id: string;
  } | null;
  unread_count: number;
};

type Props = {
  myId: string;
  activeConnectionId?: number;
};

function Avatar({ avatarId, firstName, size = 44 }: { avatarId?: string | null; firstName: string; size?: number }) {
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
      backgroundColor: "rgba(123,97,255,0.2)", border: "1px solid rgba(123,97,255,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#a590ff", flexShrink: 0,
    }}>
      {firstName?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 2) return "now";
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ConversationList({ myId, activeConnectionId }: Props) {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConvos = useCallback(async () => {
    const res = await fetch("/api/portal/messages");
    if (res.ok) {
      const { data } = await res.json();
      setConvos(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadConvos();
    const interval = setInterval(loadConvos, 5000);
    return () => clearInterval(interval);
  }, [loadConvos]);

  if (loading) {
    return (
      <div style={{ padding: "32px 24px", textAlign: "center" }}>
        <p style={{ color: "#606080", fontSize: "14px" }}>Loading…</p>
      </div>
    );
  }

  if (convos.length === 0) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "36px", marginBottom: "12px" }}>💬</div>
        <p style={{ color: "#606080", fontSize: "14px", margin: 0 }}>
          No conversations yet.
        </p>
        <p style={{ color: "#505068", fontSize: "13px", marginTop: "6px" }}>
          Connect with someone from the community to start messaging.
        </p>
        <a href="/portal/community" style={{
          display: "inline-block", marginTop: "16px",
          padding: "8px 20px", borderRadius: "8px",
          border: "1px solid rgba(123,97,255,0.35)",
          color: "#a590ff", textDecoration: "none", fontSize: "13px", fontWeight: 600,
        }}>
          Go to Community →
        </a>
      </div>
    );
  }

  return (
    <div>
      {convos.map(convo => {
        const isActive = convo.connection_id === activeConnectionId;
        const name = `${convo.other_user.first_name} ${convo.other_user.last_name || ""}`.trim();
        const preview = convo.last_message
          ? (convo.last_message.sender_id === myId ? "You: " : "") + convo.last_message.content
          : "No messages yet";

        return (
          <a
            key={convo.connection_id}
            href={`/portal/messages/${convo.connection_id}`}
            style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "14px 20px", textDecoration: "none",
              backgroundColor: isActive ? "rgba(123,97,255,0.12)" : "transparent",
              borderLeft: isActive ? "3px solid #7b61ff" : "3px solid transparent",
              transition: "background 0.15s",
            }}
          >
            <div style={{ position: "relative" }}>
              <Avatar avatarId={convo.other_user.avatar} firstName={convo.other_user.first_name} size={42} />
              {convo.unread_count > 0 && (
                <span style={{
                  position: "absolute", top: -2, right: -2,
                  backgroundColor: "#7b61ff", color: "white",
                  fontSize: "10px", fontWeight: 700,
                  borderRadius: "100px", minWidth: "16px", height: "16px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 4px",
                }}>
                  {convo.unread_count}
                </span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{
                  fontSize: "14px", fontWeight: convo.unread_count > 0 ? 700 : 600,
                  color: convo.unread_count > 0 ? "#f0eeff" : "#c0b8e8",
                }}>
                  {name}
                </span>
                {convo.last_message && (
                  <span style={{ fontSize: "11px", color: "#505068" }}>
                    {timeAgo(convo.last_message.date_created)}
                  </span>
                )}
              </div>
              <p style={{
                fontSize: "12px", margin: "3px 0 0",
                color: convo.unread_count > 0 ? "#a0a0c0" : "#606080",
                fontWeight: convo.unread_count > 0 ? 500 : 400,
                overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
              }}>
                {preview.slice(0, 60)}
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
