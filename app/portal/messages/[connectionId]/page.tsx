import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PortalNav from "../../PortalNav";
import ConversationList from "../ConversationList";
import ChatView from "./ChatView";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || "https://directus-production-21fe.up.railway.app";
const ADMIN_TOKEN  = process.env.DIRECTUS_API_TOKEN!;

type UserObj = { id: string; first_name: string; last_name: string; avatar: string | null };

/**
 * Batch-fetch Directus users by a set of UUIDs.
 */
async function fetchUsers(ids: Set<string>): Promise<Map<string, UserObj>> {
  const map = new Map<string, UserObj>();
  if (ids.size === 0) return map;

  const idList = [...ids];
  const filter = idList.map((id, i) => `filter[id][_in][${i}]=${id}`).join("&");
  const res = await fetch(
    `${DIRECTUS_URL}/users?${filter}&fields[]=id,first_name,last_name,avatar&limit=${idList.length}`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
  );
  if (res.ok) {
    const { data: users } = await res.json();
    for (const u of users ?? []) map.set(u.id, u);
  }
  return map;
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId: connectionIdStr } = await params;
  const connectionId = parseInt(connectionIdStr, 10);

  const cookieStore = await cookies();
  const token = cookieStore.get("directus_token")?.value;
  if (!token) redirect("/portal/login");

  const role = cookieStore.get("portal_role")?.value || "";
  if (!role || role === "applicant") redirect("/portal/login");

  const meRes = await fetch(
    `${DIRECTUS_URL}/users/me?fields[]=id,first_name,last_name,avatar`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!meRes.ok) redirect("/portal/login");
  const { data: user } = await meRes.json();

  // Fetch the connection — flat fields (requester/recipient are bare UUIDs)
  const connRes = await fetch(
    `${DIRECTUS_URL}/items/user_connections/${connectionId}?fields[]=id,status,requester,recipient`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
  );
  if (!connRes.ok) redirect("/portal/messages");
  const { data: connection } = await connRes.json();

  if (connection.status !== "accepted") redirect("/portal/messages");

  const requesterId = typeof connection.requester === "string" ? connection.requester : connection.requester?.id;
  const recipientId = typeof connection.recipient === "string" ? connection.recipient : connection.recipient?.id;

  // Security check
  if (requesterId !== user.id && recipientId !== user.id) {
    redirect("/portal/messages");
  }

  // Hydrate the other user's info
  const otherId = requesterId === user.id ? recipientId : requesterId;
  const otherUserMap = await fetchUsers(new Set([otherId]));
  const otherUser = otherUserMap.get(otherId) ?? { id: otherId, first_name: "Member", last_name: "", avatar: null };

  // Fetch initial messages — flat fields (sender is a UUID)
  const msgsRes = await fetch(
    `${DIRECTUS_URL}/items/direct_messages` +
    `?fields[]=id,content,date_created,read_at,sender` +
    `&filter[connection_id][_eq]=${connectionId}&sort[]=date_created&limit=100`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
  );

  let initialMessages: { id: number; content: string; date_created: string; read_at: string | null; sender: UserObj }[] = [];
  if (msgsRes.ok) {
    const json = await msgsRes.json();
    const rawMessages = json.data ?? [];

    // Collect sender UUIDs and hydrate
    const senderIds = new Set<string>();
    for (const m of rawMessages) {
      if (typeof m.sender === "string" && m.sender) senderIds.add(m.sender);
    }
    const senderMap = await fetchUsers(senderIds);

    initialMessages = rawMessages.map((m: Record<string, unknown>) => ({
      id: m.id,
      content: m.content,
      date_created: m.date_created,
      read_at: m.read_at ?? null,
      sender:
        typeof m.sender === "string"
          ? senderMap.get(m.sender) ?? { id: m.sender, first_name: "Member", last_name: "", avatar: null }
          : m.sender ?? { id: "", first_name: "Member", last_name: "", avatar: null },
    }));
  }

  const isTeacher = role === "teacher";
  const tabs = isTeacher
    ? [
        { label: "Dashboard",  href: "/portal/teacher" },
        { label: "Classes",    href: "/portal/classes" },
        { label: "Library",    href: "/portal/library" },
        { label: "Community",  href: "/portal/community" },
        { label: "People",     href: "/portal/people" },
      ]
    : [
        { label: "Dashboard",  href: "/portal/student" },
        { label: "Classes",    href: "/portal/classes" },
        { label: "Library",    href: "/portal/library" },
        { label: "Community",  href: "/portal/community" },
        { label: "People",     href: "/portal/people" },
      ];

  const otherName = `${otherUser.first_name} ${otherUser.last_name ?? ""}`.trim();

  return (
    <main style={{ backgroundColor: "#0d0d1a", minHeight: "100vh", color: "#f0eeff", display: "flex", flexDirection: "column" }}>
      <PortalNav
        tabs={tabs}
        userId={user.id}
        firstName={user.first_name}
        avatarId={user.avatar}
        role={role}
      />

      <div style={{ flex: 1, display: "flex", maxWidth: "1000px", width: "100%", margin: "0 auto", padding: "24px", gap: "24px", boxSizing: "border-box" }}>
        {/* Sidebar: conversation list */}
        <div style={{
          width: "280px", flexShrink: 0,
          backgroundColor: "rgba(26,26,46,0.7)",
          border: "1px solid rgba(123,97,255,0.12)",
          borderRadius: "12px", overflow: "hidden",
        }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(123,97,255,0.1)" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#c0b8e8", margin: 0 }}>Messages</h2>
          </div>
          <ConversationList myId={user.id} activeConnectionId={connectionId} />
        </div>

        {/* Main chat area */}
        <div style={{
          flex: 1, minWidth: 0,
          backgroundColor: "rgba(26,26,46,0.7)",
          border: "1px solid rgba(123,97,255,0.12)",
          borderRadius: "12px", overflow: "hidden",
          display: "flex", flexDirection: "column",
          height: "calc(100vh - 180px)",
        }}>
          {/* Chat header */}
          <div style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(123,97,255,0.1)",
            display: "flex", alignItems: "center", gap: "12px",
          }}>
            {otherUser.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/portal/files/${otherUser.avatar}?inline=1`}
                alt={otherName}
                style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                backgroundColor: "rgba(123,97,255,0.2)", border: "1px solid rgba(123,97,255,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: "#a590ff", flexShrink: 0,
              }}>
                {otherUser.first_name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#e0d8ff" }}>{otherName}</p>
            </div>
          </div>

          <ChatView
            connectionId={connectionId}
            myId={user.id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialMessages={initialMessages as any}
            otherUser={otherUser}
          />
        </div>
      </div>
    </main>
  );
}
