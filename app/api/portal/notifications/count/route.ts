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

  // Run connection requests count + get accepted connection IDs in parallel
  const [connReqRes, myConnsRes] = await Promise.all([
    // Pending connection requests where I am the recipient
    fetch(
      `${DIRECTUS_URL}/items/user_connections` +
      `?filter[recipient][_eq]=${me.id}&filter[status][_eq]=pending&aggregate[count]=id`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
    ),
    // My accepted connections (to scope unread messages)
    fetch(
      `${DIRECTUS_URL}/items/user_connections` +
      `?fields[]=id&filter[status][_eq]=accepted` +
      `&filter[_or][0][requester][_eq]=${me.id}&filter[_or][1][recipient][_eq]=${me.id}&limit=100`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
    ),
  ]);

  const pending_requests = connReqRes.ok
    ? Number((await connReqRes.json()).data?.[0]?.count?.id ?? 0)
    : 0;

  let unread_messages = 0;
  if (myConnsRes.ok) {
    const { data: myConns } = await myConnsRes.json();
    const connIds: number[] = (myConns ?? []).map((c: { id: number }) => c.id);

    if (connIds.length > 0) {
      // Count unread messages in MY connections, not sent by me
      const connFilter = connIds.map((id, i) => `filter[connection_id][_in][${i}]=${id}`).join("&");
      const msgsRes = await fetch(
        `${DIRECTUS_URL}/items/direct_messages` +
        `?${connFilter}&filter[sender][_neq]=${me.id}&filter[read_at][_null]=true&aggregate[count]=id`,
        { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
      );
      if (msgsRes.ok) {
        unread_messages = Number((await msgsRes.json()).data?.[0]?.count?.id ?? 0);
      }
    }
  }

  return NextResponse.json({
    pending_requests,
    unread_messages,
    total: pending_requests + unread_messages,
  });
}
