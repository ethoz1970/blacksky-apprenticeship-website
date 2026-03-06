"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Message = {
  id: number;
  content: string;
  date_created: string;
  sender: { id: string; first_name: string; last_name?: string; avatar?: string | null };
  read_at?: string | null;
};

type Props = {
  connectionId: number;
  myId: string;
  initialMessages: Message[];
  otherUser: {
    id: string;
    first_name: string;
    last_name?: string;
    avatar?: string | null;
  };
};

function Avatar({ avatarId, firstName, size = 32 }: { avatarId?: string | null; firstName: string; size?: number }) {
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

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function ChatView({ connectionId, myId, initialMessages, otherUser }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string>(
    initialMessages.length > 0
      ? initialMessages[initialMessages.length - 1].date_created
      : new Date(0).toISOString()
  );

  // Mark messages read on mount
  useEffect(() => {
    fetch(`/api/portal/messages/${connectionId}`, { method: "PATCH" }).catch(() => {});
  }, [connectionId]);

  // Poll for new messages every 3 seconds
  const pollMessages = useCallback(async () => {
    const after = encodeURIComponent(lastTimestampRef.current);
    const res = await fetch(`/api/portal/messages/${connectionId}?after=${after}`);
    if (res.ok) {
      const { data } = await res.json();
      if (data && data.length > 0) {
        setMessages(prev => {
          // Deduplicate by id
          const existingIds = new Set(prev.map((m: Message) => m.id));
          const newOnes = data.filter((m: Message) => !existingIds.has(m.id));
          if (newOnes.length === 0) return prev;
          lastTimestampRef.current = newOnes[newOnes.length - 1].date_created;
          return [...prev, ...newOnes];
        });
        // Mark new messages read
        fetch(`/api/portal/messages/${connectionId}`, { method: "PATCH" }).catch(() => {});
      }
    }
  }, [connectionId]);

  useEffect(() => {
    const interval = setInterval(pollMessages, 3000);
    return () => clearInterval(interval);
  }, [pollMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const content = newMsg.trim();
    if (!content) return;
    setSending(true);
    setNewMsg("");
    const res = await fetch(`/api/portal/messages/${connectionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setMessages(prev => [...prev, data]);
      lastTimestampRef.current = data.date_created;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Group messages by date
  let lastDate = "";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "20px 24px",
        display: "flex", flexDirection: "column", gap: "4px",
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ color: "#606080", fontSize: "14px" }}>
              No messages yet. Say hi to {otherUser.first_name}!
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender.id === myId;
          const msgDate = new Date(msg.date_created).toDateString();
          const showDateDivider = msgDate !== lastDate;
          lastDate = msgDate;

          return (
            <div key={msg.id}>
              {showDateDivider && (
                <div style={{
                  textAlign: "center", margin: "16px 0 12px",
                  fontSize: "11px", color: "#505068",
                  display: "flex", alignItems: "center", gap: "8px",
                }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: "rgba(123,97,255,0.1)" }} />
                  {new Date(msg.date_created).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  <div style={{ flex: 1, height: 1, backgroundColor: "rgba(123,97,255,0.1)" }} />
                </div>
              )}

              <div style={{
                display: "flex",
                flexDirection: isMe ? "row-reverse" : "row",
                alignItems: "flex-end",
                gap: "8px",
                marginBottom: "6px",
              }}>
                {!isMe && (
                  <Avatar avatarId={msg.sender.avatar} firstName={msg.sender.first_name} size={28} />
                )}

                <div style={{
                  maxWidth: "68%",
                  backgroundColor: isMe ? "#7b61ff" : "rgba(40,40,70,0.9)",
                  border: isMe ? "none" : "1px solid rgba(123,97,255,0.15)",
                  borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "10px 14px",
                }}>
                  <p style={{
                    margin: 0, fontSize: "14px",
                    color: isMe ? "white" : "#d0c8f0",
                    lineHeight: 1.6, whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}>
                    {msg.content}
                  </p>
                  <p style={{
                    margin: "4px 0 0",
                    fontSize: "10px",
                    color: isMe ? "rgba(255,255,255,0.6)" : "#505068",
                    textAlign: isMe ? "right" : "left",
                  }}>
                    {formatTime(msg.date_created)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "16px 24px",
        borderTop: "1px solid rgba(123,97,255,0.1)",
        backgroundColor: "rgba(13,13,26,0.8)",
        display: "flex", gap: "12px", alignItems: "flex-end",
      }}>
        <textarea
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${otherUser.first_name}…`}
          rows={1}
          style={{
            flex: 1, resize: "none", outline: "none",
            backgroundColor: "rgba(123,97,255,0.07)",
            border: "1px solid rgba(123,97,255,0.2)",
            borderRadius: "10px", padding: "10px 14px",
            color: "#f0eeff", fontSize: "14px", fontFamily: "inherit",
            lineHeight: 1.5, maxHeight: "120px", overflowY: "auto",
          }}
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = "auto";
            t.style.height = Math.min(t.scrollHeight, 120) + "px";
          }}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !newMsg.trim()}
          style={{
            padding: "10px 20px", borderRadius: "10px", border: "none",
            backgroundColor: sending || !newMsg.trim() ? "rgba(123,97,255,0.3)" : "#7b61ff",
            color: "white", fontWeight: 700, fontSize: "14px",
            cursor: sending || !newMsg.trim() ? "not-allowed" : "pointer",
            flexShrink: 0,
          }}
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
