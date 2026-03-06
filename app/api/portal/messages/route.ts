import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

// GET /api/portal/messages — list conversations (accepted connections + last message)
export async function GET(req: NextRequest) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=id`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await meRes.json();

  // Get accepted connections
  const connRes = await fetch(
    `${DIRECTUS_URL}/items/user_connections` +
    `?fields[]=id,requester.id,requester.first_name,requester.last_name,requester.avatar` +
    `&fields[]=recipient.id,recipient.first_name,recipient.last_name,recipient.avatar` +
    `&filter[status][_eq]=accepted` +
    `&filter[_or][0][requester][_eq]=${me.id}&filter[_or][1][recipient][_eq]=${me.id}&limit=100`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!connRes.ok) return NextResponse.json({ conversations: [] });
  const { data: connections } = await connRes.json();

  // For each connection, fetch the last message + unread count
  const conversations = await Promise.all(
    (connections ?? []).map(async (conn: {
      id: number;
      requester: { id: string; first_name: string; last_name: string; avatar?: string | null };
      recipient: { id: string; first_name: string; last_name: string; avatar?: string | null };
    }) => {
      const other = conn.requester?.id === me.id ? conn.recipient : conn.requester;

      const [lastMsgRes, unreadRes] = await Promise.all([
        fetch(
          `${DIRECTUS_URL}/items/direct_messages` +
          `?fields[]=id,content,date_created,sender.id,read_at` +
          `&filter[connection_id][_eq]=${conn.id}&sort[]=-date_created&limit=1`,
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
        ),
        fetch(
          `${DIRECTUS_URL}/items/direct_messages` +
          `?aggregate[count]=id&filter[connection_id][_eq]=${conn.id}&filter[read_at][_null]=true&filter[sender][_neq]=${me.id}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
        ),
      ]);

      const lastMsg  = lastMsgRes.ok ? ((await lastMsgRes.json()).data?.[0] ?? null) : null;
      const unreadJson = unreadRes.ok ? await unreadRes.json() : null;
      const unread   = parseInt(unreadJson?.data?.[0]?.count?.id ?? "0", 10);

      return { connectionId: conn.id, other, lastMessage: lastMsg, unread };
    })
  );

  // Sort by last message date (most recent first), then by connection id
  conversations.sort((a, b) => {
    const aDate = a.lastMessage?.date_created ?? "0";
    const bDate = b.lastMessage?.date_created ?? "0";
    return bDate.localeCompare(aDate);
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);
  return NextResponse.json({ conversations, totalUnread, my_id: me.id });
}
