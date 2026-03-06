import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

const CONNECTION_FIELDS =
  "fields[]=id,date_created,status" +
  "&fields[]=requester.id,requester.first_name,requester.last_name,requester.avatar" +
  "&fields[]=recipient.id,recipient.first_name,recipient.last_name,recipient.avatar";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=id`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await meRes.json();

  // Fetch all connections where I am requester or recipient
  const res = await fetch(
    `${DIRECTUS_URL}/items/user_connections?${CONNECTION_FIELDS}` +
    `&filter[_or][0][requester][_eq]=${me.id}&filter[_or][1][recipient][_eq]=${me.id}&limit=100`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!res.ok) return NextResponse.json({ error: "Failed to fetch connections" }, { status: res.status });
  const { data } = await res.json();
  const all = data ?? [];

  return NextResponse.json({
    accepted:         all.filter((c: { status: string }) => c.status === "accepted"),
    pending_sent:     all.filter((c: { status: string; requester: { id: string } }) => c.status === "pending" && c.requester?.id === me.id),
    pending_received: all.filter((c: { status: string; recipient: { id: string } }) => c.status === "pending" && c.recipient?.id === me.id),
    my_id:            me.id,
  });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=id`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await meRes.json();

  const { recipient_id } = await req.json();
  if (!recipient_id) return NextResponse.json({ error: "recipient_id required" }, { status: 400 });
  if (recipient_id === me.id) return NextResponse.json({ error: "Cannot connect to yourself" }, { status: 400 });

  // Check for existing connection
  const existing = await fetch(
    `${DIRECTUS_URL}/items/user_connections?fields[]=id,status` +
    `&filter[_or][0][_and][0][requester][_eq]=${me.id}&filter[_or][0][_and][1][recipient][_eq]=${recipient_id}` +
    `&filter[_or][1][_and][0][requester][_eq]=${recipient_id}&filter[_or][1][_and][1][recipient][_eq]=${me.id}` +
    `&limit=1`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  const existingJson = await existing.json();
  if (existingJson.data?.length > 0) {
    return NextResponse.json({ error: "Connection already exists", existing: existingJson.data[0] }, { status: 409 });
  }

  const res = await fetch(`${DIRECTUS_URL}/items/user_connections`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requester: me.id, recipient: recipient_id, status: "pending" }),
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to send request" }, { status: res.status });
  const json = await res.json();
  return NextResponse.json({ data: json.data }, { status: 201 });
}
