"use client";

import { useState } from "react";

type Author = {
  id: string;
  first_name: string;
  last_name?: string;
  avatar?: string | null;
};

type Comment = {
  id: number;
  content: string;
  date_created: string;
  author: Author;
};

export type Post = {
  id: number;
  content: string;
  scope: string;
  date_created: string;
  author: Author;
  image?: { id: string; filename_download: string } | null;
  attachment?: { id: string; filename_download: string } | null;
  link_url?: string | null;
  link_title?: string | null;
  link_description?: string | null;
  link_image?: string | null;
};

type Props = {
  post: Post;
  myId: string;
  myAvatar?: string | null;
  myFirstName: string;
  isConnected: boolean;
  connectionPending: boolean;
  onConnect: (authorId: string) => void;
};

function Avatar({ avatarId, firstName, size = 36 }: { avatarId?: string | null; firstName: string; size?: number }) {
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
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PostCard({ post, myId, myAvatar, myFirstName, isConnected, connectionPending, onConnect }: Props) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const isOwnPost = post.author.id === myId;
  const authorName = `${post.author.first_name} ${post.author.last_name || ""}`.trim();

  async function loadComments() {
    if (commentsLoaded) return;
    const res = await fetch(`/api/portal/community/posts/${post.id}/comments`);
    if (res.ok) {
      const { data } = await res.json();
      setComments(data ?? []);
    }
    setCommentsLoaded(true);
  }

  async function toggleComments() {
    if (!showComments) await loadComments();
    setShowComments(v => !v);
  }

  async function submitComment() {
    if (!newComment.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/portal/community/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment.trim() }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setComments(prev => [...prev, data]);
      setNewComment("");
    }
    setSubmitting(false);
  }

  async function handleConnect() {
    setConnecting(true);
    await onConnect(post.author.id);
    setConnecting(false);
  }

  return (
    <div style={{
      backgroundColor: "rgba(26,26,46,0.7)",
      border: "1px solid rgba(123,97,255,0.12)",
      borderRadius: "12px",
      overflow: "hidden",
    }}>
      {/* Post header */}
      <div style={{ padding: "20px 20px 16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <Avatar avatarId={post.author.avatar} firstName={post.author.first_name} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#e0d8ff" }}>{authorName}</span>
            {post.scope === "class" && (
              <span style={{
                fontSize: "10px", fontWeight: 600, color: "#7b61ff",
                backgroundColor: "rgba(123,97,255,0.12)", border: "1px solid rgba(123,97,255,0.25)",
                borderRadius: "100px", padding: "2px 8px",
              }}>
                Class
              </span>
            )}
            <span style={{ fontSize: "12px", color: "#505068", marginLeft: "auto" }}>
              {timeAgo(post.date_created)}
            </span>
          </div>

          {/* Connect button — only for other users not yet connected */}
          {!isOwnPost && !isConnected && (
            <button
              onClick={handleConnect}
              disabled={connecting || connectionPending}
              style={{
                marginTop: "6px",
                padding: "3px 12px", borderRadius: "100px", fontSize: "11px", fontWeight: 600,
                cursor: connectionPending || connecting ? "default" : "pointer",
                border: connectionPending ? "1px solid rgba(123,97,255,0.2)" : "1px solid rgba(123,97,255,0.4)",
                backgroundColor: connectionPending ? "transparent" : "rgba(123,97,255,0.1)",
                color: connectionPending ? "#505068" : "#a590ff",
              }}
            >
              {connecting ? "Sending…" : connectionPending ? "Request sent" : "+ Connect"}
            </button>
          )}
          {!isOwnPost && isConnected && (
            <a href="/portal/messages" style={{
              display: "inline-block", marginTop: "6px",
              padding: "3px 12px", borderRadius: "100px", fontSize: "11px", fontWeight: 600,
              border: "1px solid rgba(97,212,255,0.3)",
              backgroundColor: "rgba(97,212,255,0.08)",
              color: "#61d4ff", textDecoration: "none",
            }}>
              ✉ Message
            </a>
          )}
        </div>
      </div>

      {/* Post body */}
      <div style={{ padding: "0 20px 16px" }}>
        {post.content && (
          <p style={{ fontSize: "15px", color: "#d0c8f0", lineHeight: 1.7, margin: "0 0 12px", whiteSpace: "pre-wrap" }}>
            {post.content}
          </p>
        )}

        {/* Image */}
        {post.image && (
          <div style={{ marginBottom: "12px", borderRadius: "8px", overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/portal/files/${post.image.id}?inline=1`}
              alt={post.image.filename_download}
              style={{ width: "100%", maxHeight: "400px", objectFit: "cover", display: "block" }}
            />
          </div>
        )}

        {/* File attachment */}
        {post.attachment && (
          <a
            href={`/api/portal/files/${post.attachment.id}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "10px 16px", borderRadius: "8px",
              border: "1px solid rgba(123,97,255,0.2)",
              backgroundColor: "rgba(123,97,255,0.07)",
              textDecoration: "none", color: "#c0b0ff", fontSize: "13px",
              marginBottom: "12px",
            }}
          >
            📎 {post.attachment.filename_download}
          </a>
        )}

        {/* Link preview */}
        {post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block", textDecoration: "none",
              border: "1px solid rgba(123,97,255,0.18)",
              borderRadius: "8px", overflow: "hidden",
              backgroundColor: "rgba(13,13,26,0.6)",
              marginBottom: "12px",
            }}
          >
            {post.link_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.link_image}
                alt=""
                style={{ width: "100%", maxHeight: "160px", objectFit: "cover", display: "block" }}
              />
            )}
            <div style={{ padding: "12px 14px" }}>
              {post.link_title && (
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#d0d0e8", margin: "0 0 4px" }}>
                  {post.link_title}
                </p>
              )}
              {post.link_description && (
                <p style={{ fontSize: "12px", color: "#8080a0", margin: "0 0 6px", lineHeight: 1.5 }}>
                  {post.link_description.slice(0, 120)}
                </p>
              )}
              <p style={{ fontSize: "11px", color: "#606080", margin: 0 }}>
                {post.link_url}
              </p>
            </div>
          </a>
        )}
      </div>

      {/* Action bar */}
      <div style={{
        padding: "10px 20px",
        borderTop: "1px solid rgba(123,97,255,0.08)",
        display: "flex", gap: "16px",
      }}>
        <button
          onClick={toggleComments}
          style={{
            background: "none", border: "none",
            color: showComments ? "#a590ff" : "#707090",
            fontSize: "13px", cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: "6px",
          }}
        >
          💬 {showComments ? "Hide" : "Comment"}
          {commentsLoaded && comments.length > 0 && (
            <span style={{
              backgroundColor: "rgba(123,97,255,0.15)",
              borderRadius: "100px", padding: "1px 7px",
              fontSize: "11px", color: "#a590ff",
            }}>
              {comments.length}
            </span>
          )}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div style={{
          borderTop: "1px solid rgba(123,97,255,0.08)",
          backgroundColor: "rgba(13,13,26,0.4)",
          padding: "16px 20px",
        }}>
          {!commentsLoaded ? (
            <p style={{ fontSize: "13px", color: "#606080", margin: 0 }}>Loading…</p>
          ) : comments.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#505068", margin: "0 0 16px" }}>No comments yet. Be the first!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "16px" }}>
              {comments.map(c => (
                <div key={c.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <Avatar avatarId={c.author.avatar} firstName={c.author.first_name} size={28} />
                  <div style={{
                    backgroundColor: "rgba(26,26,46,0.8)",
                    border: "1px solid rgba(123,97,255,0.1)",
                    borderRadius: "8px", padding: "8px 12px", flex: 1,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#c0b8e8" }}>
                        {c.author.first_name} {c.author.last_name || ""}
                      </span>
                      <span style={{ fontSize: "11px", color: "#404058" }}>{timeAgo(c.date_created)}</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#b0a8d0", margin: 0, lineHeight: 1.6 }}>
                      {c.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* New comment input */}
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <Avatar avatarId={myAvatar} firstName={myFirstName} size={28} />
            <div style={{ flex: 1 }}>
              <textarea
                placeholder="Write a comment…"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                rows={2}
                style={{
                  width: "100%", boxSizing: "border-box",
                  backgroundColor: "rgba(123,97,255,0.06)",
                  border: "1px solid rgba(123,97,255,0.18)",
                  borderRadius: "8px", padding: "8px 12px",
                  color: "#f0eeff", fontSize: "13px",
                  resize: "none", outline: "none", fontFamily: "inherit",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
                <button
                  onClick={submitComment}
                  disabled={submitting || !newComment.trim()}
                  style={{
                    padding: "6px 16px", borderRadius: "6px", border: "none",
                    backgroundColor: submitting || !newComment.trim() ? "rgba(123,97,255,0.3)" : "#7b61ff",
                    color: "white", fontSize: "12px", fontWeight: 700,
                    cursor: submitting || !newComment.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Posting…" : "Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
