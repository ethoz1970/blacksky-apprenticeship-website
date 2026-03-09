import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PortalNav from "../../PortalNav";
import ConversationList from "../ConversationList";
import ChatView from "./ChatView";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  "https://directus-production-21fe.up.railway.app";

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

  // Fetch the connection to verify membership and get other user
  const connRes = await fetch(
    `${DIRECTUS_URL}/items/user_connections/${connectionId}` +
    `?fields[]=id,status,requester.id,requester.first_name,requester.last_name,requester.avatar` +
    `,recipient.id,recipient.first_name,recipient.last_name,recipient.avatar`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!connRes.ok) redirect("/portal/messages");
  const { data: connection } = await connRes.json();

  if (connection.status !== "accepted") redirect("/portal/messages");

  // Determine who the other user is
  const isRequester = connection.requester.id === user.id;
  const otherUser = isRequester ? connection.recipient : connection.requester;

  // Fetch initial messages directly from Directus
  const msgsRes = await fetch(
    `${DIRECTUS_URL}/items/direct_messages` +
    `?fields[]=id,content,date_created,read_at` +
    `&fields[]=sender.id,sender.first_name,sender.last_name,sender.avatar` +
    `&filter[connection_id][_eq]=${connectionId}&sort[]=date_created&limit=100`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  let initialMessages: unknown[] = [];
  if (msgsRes.ok) {
    const json = await msgsRes.json();
    initialMessages = json.data ?? [];
  }

  const isTeacher = role === "teacher";
  const tabs = isTeacher
    ? [
        { label: "Dashboard", href: "/portal/teacher" },
        { label: "Community", href: "/portal/community" },
        { label: "People", href: "/portal/people" },
        { label: "Messages", href: "/portal/messages" },
      ]
    : [
        { label: "Dashboard", href: "/portal/student" },
        { label: "Community", href: "/portal/community" },
        { label: "People", href: "/portal/people" },
        { label: "Messages", href: "/portal/messages" },
      ];

  const otherName = `${otherUser.first_name} ${otherUser.last_name || ""}`.trim();

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
                {otherUser.first_name[0]?.toUpperCase()}
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
