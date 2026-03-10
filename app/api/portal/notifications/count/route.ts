import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const ADMIN_TOKEN  = process.env.DIRECTUS_API_TOKEN!;

export async function GET(req: NextRequest) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=id`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await meRes.json();

  // Run both counts in parallel.
  // Admin token is used so that the old "sender === me only" permission
  // doesn't zero out the unread count for message recipients.
  const [connRes, msgsRes] = await Promise.all([
    // Pending connection requests where I am the recipient
    fetch(
      `${DIRECTUS_URL}/items/user_connections` +
      `?filter[recipient][_eq]=${me.id}&filter[status][_eq]=pending&aggregate[count]=id`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
    ),
    // Unread direct messages not sent by me
    fetch(
      `${DIRECTUS_URL}/items/direct_messages` +
      `?filter[sender][_neq]=${me.id}&filter[read_at][_null]=true&aggregate[count]=id`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
    ),
  ]);

  const pending_requests = connRes.ok
    ? Number((await connRes.json()).data?.[0]?.count?.id ?? 0)
    : 0;

  const unread_messages = msgsRes.ok
    ? Number((await msgsRes.json()).data?.[0]?.count?.id ?? 0)
    : 0;

  return NextResponse.json({
    pending_requests,
    unread_messages,
    total: pending_requests + unread_messages,
  });
}
