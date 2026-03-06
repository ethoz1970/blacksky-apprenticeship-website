"use client";

import { useState, useEffect, useCallback } from "react";
import PostCard, { type Post } from "./PostCard";
import CreatePost from "./CreatePost";

type Connection = {
  id: number;
  status: "accepted" | "pending";
  other_user_id: string;
};

type Props = {
  myId: string;
  myAvatar?: string | null;
  myFirstName: string;
  classId?: number | null;
  scope: "global" | "class" | "all";
};

export default function PostFeed({ myId, myAvatar, myFirstName, classId, scope }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeScope, setActiveScope] = useState<"global" | "class">(
    scope === "class" ? "class" : "global"
  );

  const loadPosts = useCallback(async (s: "global" | "class") => {
    setLoading(true);
    const url = s === "class" && classId
      ? `/api/portal/community/posts?scope=class&class_id=${classId}`
      : `/api/portal/community/posts?scope=global`;
    const res = await fetch(url);
    if (res.ok) {
      const { data } = await res.json();
      setPosts(data ?? []);
    }
    setLoading(false);
  }, [classId]);

  async function loadConnections() {
    const res = await fetch("/api/portal/connections");
    if (res.ok) {
      // Connections API returns { accepted, pending_sent, pending_received, my_id } directly (no data wrapper)
      const json = await res.json();
      const accepted: Connection[] = (json.accepted ?? [])
        .filter((c: { requester?: { id: string }; recipient?: { id: string } }) => c.requester?.id && c.recipient?.id)
        .map((c: { id: number; requester: { id: string }; recipient: { id: string } }) => ({
          id: c.id,
          status: "accepted" as const,
          other_user_id: c.requester.id === myId ? c.recipient.id : c.requester.id,
        }));
      const pending_sent: Connection[] = (json.pending_sent ?? [])
        .filter((c: { recipient?: { id: string } }) => c.recipient?.id)
        .map((c: { id: number; recipient: { id: string } }) => ({
          id: c.id,
          status: "pending" as const,
          other_user_id: c.recipient.id,
        }));
      setConnections([...accepted, ...pending_sent]);
    }
  }

  useEffect(() => {
    loadPosts(activeScope);
    loadConnections();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScope]);

  async function handleConnect(authorId: string) {
    const res = await fetch("/api/portal/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_id: authorId }),
    });
    if (res.ok) {
      await loadConnections();
    }
  }

  function handleNewPost(post: Post) {
    setPosts(prev => [post, ...prev]);
  }

  function getConnectionStatus(userId: string): { connected: boolean; pending: boolean } {
    const conn = connections.find(c => c.other_user_id === userId);
    if (!conn) return { connected: false, pending: false };
    if (conn.status === "accepted") return { connected: true, pending: false };
    return { connected: false, pending: true };
  }

  return (
    <div>
      {/* Scope tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        <button
          onClick={() => setActiveScope("global")}
          style={{
            padding: "7px 18px", borderRadius: "100px", fontSize: "13px", fontWeight: 600,
            cursor: "pointer",
            border: activeScope === "global" ? "1px solid rgba(123,97,255,0.6)" : "1px solid rgba(123,97,255,0.2)",
            backgroundColor: activeScope === "global" ? "rgba(123,97,255,0.15)" : "transparent",
            color: activeScope === "global" ? "#c0b0ff" : "#707090",
          }}
        >
          🌐 Global
        </button>
        {classId && (
          <button
            onClick={() => setActiveScope("class")}
            style={{
              padding: "7px 18px", borderRadius: "100px", fontSize: "13px", fontWeight: 600,
              cursor: "pointer",
              border: activeScope === "class" ? "1px solid rgba(123,97,255,0.6)" : "1px solid rgba(123,97,255,0.2)",
              backgroundColor: activeScope === "class" ? "rgba(123,97,255,0.15)" : "transparent",
              color: activeScope === "class" ? "#c0b0ff" : "#707090",
            }}
          >
            🎓 My Class
          </button>
        )}
      </div>

      {/* Create post */}
      <div style={{ marginBottom: "24px" }}>
        <CreatePost
          myAvatar={myAvatar}
          myFirstName={myFirstName}
          classId={classId}
          onPosted={handleNewPost}
        />
      </div>

      {/* Feed */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <p style={{ color: "#606080", fontSize: "14px" }}>Loading posts…</p>
        </div>
      ) : posts.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          border: "1px dashed rgba(123,97,255,0.18)", borderRadius: "12px",
          backgroundColor: "rgba(13,13,26,0.3)",
        }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>✨</div>
          <p style={{ color: "#707090", fontSize: "15px", margin: 0 }}>
            No posts yet. Be the first to share something!
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {posts.map(post => {
            // Guard: author may be a bare UUID string on freshly-created posts
            const authorId = typeof post.author === "object" && post.author !== null
              ? post.author.id
              : (post.author as unknown as string) ?? "";
            const { connected, pending } = getConnectionStatus(authorId);
            return (
              <PostCard
                key={post.id}
                post={post}
                myId={myId}
                myAvatar={myAvatar}
                myFirstName={myFirstName}
                isConnected={connected}
                connectionPending={pending}
                onConnect={handleConnect}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
