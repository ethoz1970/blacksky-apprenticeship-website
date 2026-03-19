import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL  = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const ADMIN_TOKEN   = process.env.DIRECTUS_API_TOKEN!;

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

type RawMessage = Record<string, unknown>;

/**
 * Hydrate bare-UUID sender fields on messages into full user objects.
 */
async function hydrateMessages(messages: RawMessage[]): Promise<RawMessage[]> {
  const senderIds = new Set<string>();
  for (const m of messages) {
    if (typeof m.sender === "string" && m.sender) senderIds.add(m.sender);
  }

  const userMap = await fetchUsers(senderIds);

  return messages.map(m => ({
    ...m,
    sender:
      typeof m.sender === "string"
        ? userMap.get(m.sender) ?? { id: m.sender, first_name: "Member", last_name: "", avatar: null }
        : m.sender ?? { id: "", first_name: "Member", last_name: "", avatar: null },
  }));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ connectionId: string }> }) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { connectionId } = await params;

  // Verify user identity
  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=id`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await meRes.json();

  // Verify user belongs to this connection (flat fields — requester/recipient are UUIDs)
  const connRes = await fetch(
    `${DIRECTUS_URL}/items/user_connections/${connectionId}?fields[]=id,status,requester,recipient`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
  );
  if (!connRes.ok) return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  const { data: conn } = await connRes.json();

  const requesterId = typeof conn.requester === "string" ? conn.requester : conn.requester?.id;
  const recipientId = typeof conn.recipient === "string" ? conn.recipient : conn.recipient?.id;

  if (requesterId !== me.id && recipientId !== me.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const after = searchParams.get("after");
  const afterFilter = after ? `&filter[date_created][_gt]=${after}` : "";

  // Fetch messages — flat fields (sender is a UUID)
  const res = await fetch(
    `${DIRECTUS_URL}/items/direct_messages` +
    `?fields[]=id,content,date_created,read_at,sender` +
    `&filter[connection_id][_eq]=${connectionId}&sort[]=date_created&limit=100${afterFilter}`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
  );
  if (!res.ok) return NextResponse.json({ error: "Failed to fetch messages" }, { status: res.status });
  const json = await res.json();

  // Hydrate sender UUIDs into full user objects
  const messages = await hydrateMessages(json.data ?? []);
  return NextResponse.json({ data: messages });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ connectionId: string }> }) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { connectionId } = await params;

  // Get current user info
  const meRes = await fetch(
    `${DIRECTUS_URL}/users/me?fields[]=id,first_name,last_name,avatar`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await meRes.json();

  // Verify user is part of this connection
  const connRes = await fetch(
    `${DIRECTUS_URL}/items/user_connections/${connectionId}?fields[]=id,status,requester,recipient`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
  );
  if (!connRes.ok) return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  const { data: conn } = await connRes.json();
  if (conn.status !== "accepted") return NextResponse.json({ error: "Not connected" }, { status: 403 });

  const requesterId = typeof conn.requester === "string" ? conn.requester : conn.requester?.id;
  const recipientId = typeof conn.recipient === "string" ? conn.recipient : conn.recipient?.id;
  if (requesterId !== me.id && recipientId !== me.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  // Create the message using admin token
  const res = await fetch(`${DIRECTUS_URL}/items/direct_messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ connection_id: parseInt(connectionId), sender: me.id, content: content.trim() }),
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to send message" }, { status: res.status });
  const json = await res.json();

  // Return message with hydrated sender (use info from /users/me)
  const messageData = {
    id: json.data.id,
    content: json.data.content,
    date_created: json.data.date_created,
    read_at: json.data.read_at ?? null,
    sender: { id: me.id, first_name: me.first_name, last_name: me.last_name ?? "", avatar: me.avatar ?? null },
  };

  return NextResponse.json({ data: messageData }, { status: 201 });
}

// PATCH — mark messages as read
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ connectionId: string }> }) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { connectionId } = await params;

  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=id`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await meRes.json();

  // Find unread messages sent by the OTHER person
  const unreadRes = await fetch(
    `${DIRECTUS_URL}/items/direct_messages` +
    `?fields[]=id&filter[connection_id][_eq]=${connectionId}` +
    `&filter[read_at][_null]=true&filter[sender][_neq]=${me.id}&limit=100`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
  );
  const unreadJson = await unreadRes.json();
  const unread = unreadJson?.data ?? [];
  if (!unread.length) return NextResponse.json({ ok: true });

  const ids = unread.map((m: { id: number }) => m.id);
  await fetch(`${DIRECTUS_URL}/items/direct_messages`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ keys: ids, data: { read_at: new Date().toISOString() } }),
  });
  return NextResponse.json({ ok: true, marked: ids.length });
}
