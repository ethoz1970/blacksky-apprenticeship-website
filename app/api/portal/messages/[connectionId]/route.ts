import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL  = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const ADMIN_TOKEN   = process.env.DIRECTUS_API_TOKEN!;

export async function GET(req: NextRequest, { params }: { params: Promise<{ connectionId: string }> }) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { connectionId } = await params;

  // First verify the user actually belongs to this connection (security check).
  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=id`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await meRes.json();

  const connRes = await fetch(
    `${DIRECTUS_URL}/items/user_connections/${connectionId}?fields[]=id,status,requester,recipient`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
  );
  if (!connRes.ok) return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  const { data: conn } = await connRes.json();

  // Extract IDs whether Directus returns expanded objects or raw UUIDs
  const requesterId = typeof conn.requester === "object" ? conn.requester?.id : conn.requester;
  const recipientId = typeof conn.recipient === "object" ? conn.recipient?.id : conn.recipient;

  if (requesterId !== me.id && recipientId !== me.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const after = searchParams.get("after"); // ISO timestamp for polling
  const afterFilter = after ? `&filter[date_created][_gt]=${after}` : "";

  // Use admin token to read messages — both sender and recipient can read all
  // messages in the conversation. Security is enforced above via connection check.
  const res = await fetch(
    `${DIRECTUS_URL}/items/direct_messages` +
    `?fields[]=id,content,date_created,read_at` +
    `&fields[]=sender.id,sender.first_name,sender.last_name,sender.avatar` +
    `&filter[connection_id][_eq]=${connectionId}&sort[]=date_created&limit=100${afterFilter}`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
  );
  if (!res.ok) return NextResponse.json({ error: "Failed to fetch messages" }, { status: res.status });
  const json = await res.json();
  return NextResponse.json({ data: json.data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ connectionId: string }> }) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { connectionId } = await params;

  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=id`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await meRes.json();

  // Verify user is part of this connection (use admin token to reliably read connection)
  const connRes = await fetch(
    `${DIRECTUS_URL}/items/user_connections/${connectionId}?fields[]=id,status,requester,recipient`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
  );
  if (!connRes.ok) return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  const { data: conn } = await connRes.json();
  if (conn.status !== "accepted") return NextResponse.json({ error: "Not connected" }, { status: 403 });

  const requesterId = typeof conn.requester === "object" ? conn.requester?.id : conn.requester;
  const recipientId = typeof conn.recipient === "object" ? conn.recipient?.id : conn.recipient;
  if (requesterId !== me.id && recipientId !== me.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const res = await fetch(`${DIRECTUS_URL}/items/direct_messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ connection_id: parseInt(connectionId), sender: me.id, content: content.trim() }),
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to send message" }, { status: res.status });
  const json = await res.json();
  return NextResponse.json({ data: json.data }, { status: 201 });
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

  // Use admin token to find unread messages sent by the OTHER person.
  // With the old permission (sender === me only), the recipient could never
  // see — or mark as read — messages sent to them.
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
