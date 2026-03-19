import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
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

// GET /api/portal/messages — list conversations (accepted connections + last message)
export async function GET(req: NextRequest) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ data: [], totalUnread: 0 }, { status: 401 });

  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=id`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!meRes.ok) return NextResponse.json({ data: [], totalUnread: 0 }, { status: 401 });
  const { data: me } = await meRes.json();

  // Fetch accepted connections — flat fields only (requester/recipient are bare UUIDs)
  const connRes = await fetch(
    `${DIRECTUS_URL}/items/user_connections` +
    `?fields[]=id,requester,recipient,status` +
    `&filter[status][_eq]=accepted` +
    `&filter[_or][0][requester][_eq]=${me.id}&filter[_or][1][recipient][_eq]=${me.id}&limit=100`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
  );
  if (!connRes.ok) return NextResponse.json({ data: [] });
  const { data: connections } = await connRes.json();

  if (!connections || connections.length === 0) {
    return NextResponse.json({ data: [], totalUnread: 0 });
  }

  // Collect all user IDs that need hydrating (the "other" person in each connection)
  const userIds = new Set<string>();
  for (const conn of connections) {
    const reqId = typeof conn.requester === "string" ? conn.requester : conn.requester?.id;
    const recId = typeof conn.recipient === "string" ? conn.recipient : conn.recipient?.id;
    if (reqId && reqId !== me.id) userIds.add(reqId);
    if (recId && recId !== me.id) userIds.add(recId);
  }
  const userMap = await fetchUsers(userIds);

  // For each connection, fetch the last message + unread count
  const conversations = await Promise.all(
    connections.map(async (conn: { id: number; requester: string; recipient: string }) => {
      const requesterId = typeof conn.requester === "string" ? conn.requester : (conn.requester as unknown as UserObj)?.id;
      const recipientId = typeof conn.recipient === "string" ? conn.recipient : (conn.recipient as unknown as UserObj)?.id;
      const otherId = requesterId === me.id ? recipientId : requesterId;
      const otherUser = userMap.get(otherId) ?? { id: otherId, first_name: "Member", last_name: "", avatar: null };

      const [lastMsgRes, unreadRes] = await Promise.all([
        fetch(
          `${DIRECTUS_URL}/items/direct_messages` +
          `?fields[]=id,content,date_created,sender,read_at` +
          `&filter[connection_id][_eq]=${conn.id}&sort[]=-date_created&limit=1`,
          { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
        ),
        fetch(
          `${DIRECTUS_URL}/items/direct_messages` +
          `?aggregate[count]=id&filter[connection_id][_eq]=${conn.id}&filter[read_at][_null]=true&filter[sender][_neq]=${me.id}`,
          { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
        ),
      ]);

      const lastMsgRaw = lastMsgRes.ok ? ((await lastMsgRes.json()).data?.[0] ?? null) : null;
      const unreadJson = unreadRes.ok ? await unreadRes.json() : null;
      const unread = parseInt(unreadJson?.data?.[0]?.count?.id ?? "0", 10);

      // Build last_message in the shape the ConversationList component expects
      const last_message = lastMsgRaw
        ? {
            content: lastMsgRaw.content,
            date_created: lastMsgRaw.date_created,
            sender_id: typeof lastMsgRaw.sender === "string" ? lastMsgRaw.sender : lastMsgRaw.sender?.id ?? "",
          }
        : null;

      return {
        connection_id: conn.id,
        other_user: otherUser,
        last_message,
        unread_count: unread,
      };
    })
  );

  // Sort by last message date (most recent first)
  conversations.sort((a, b) => {
    const aDate = a.last_message?.date_created ?? "0";
    const bDate = b.last_message?.date_created ?? "0";
    return bDate.localeCompare(aDate);
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  return NextResponse.json({ data: conversations, totalUnread });
}
