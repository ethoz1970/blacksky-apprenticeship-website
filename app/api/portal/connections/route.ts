import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const DIRECTUS_URL   = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const ADMIN_TOKEN    = process.env.DIRECTUS_API_TOKEN!;
const SITE_URL       = process.env.NEXT_PUBLIC_SITE_URL || "https://blackskyup.com";
const resend         = new Resend(process.env.RESEND_API_KEY);

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

/** Branded email wrapper matching the apply/confirm template style. */
function emailHtml(body: string) {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#333;">
      <div style="background:#1a1a2e;padding:32px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:white;font-size:24px;margin:0;font-weight:800;">
          Blacksky <span style="color:#7b61ff;">Up</span>
        </h1>
      </div>
      <div style="background:#f9f9ff;padding:40px 32px;border-radius:0 0 12px 12px;">
        ${body}
        <p style="color:#aaa;font-size:12px;margin:28px 0 0;line-height:1.6;">
          — The Blacksky Team
        </p>
      </div>
    </div>
  `;
}

function ctaButton(href: string, text: string) {
  return `<a href="${href}" style="display:inline-block;background:#7b61ff;color:white;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;margin:20px 0;">${text} →</a>`;
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=id`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await meRes.json();

  // Fetch connections with FLAT fields — requester/recipient are bare UUID strings
  const res = await fetch(
    `${DIRECTUS_URL}/items/user_connections?fields[]=id,date_created,status,requester,recipient` +
    `&filter[_or][0][requester][_eq]=${me.id}&filter[_or][1][recipient][_eq]=${me.id}&limit=100`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
  );
  if (!res.ok) return NextResponse.json({ error: "Failed to fetch connections" }, { status: res.status });
  const { data } = await res.json();
  const all = data ?? [];

  // Collect all user IDs that need hydrating
  const userIds = new Set<string>();
  for (const c of all) {
    const reqId = typeof c.requester === "string" ? c.requester : c.requester?.id;
    const recId = typeof c.recipient === "string" ? c.recipient : c.recipient?.id;
    if (reqId) userIds.add(reqId);
    if (recId) userIds.add(recId);
  }
  const userMap = await fetchUsers(userIds);

  // Hydrate connections with full user objects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hydrated = all.map((c: any) => {
    const reqId = typeof c.requester === "string" ? c.requester : c.requester?.id ?? "";
    const recId = typeof c.recipient === "string" ? c.recipient : c.recipient?.id ?? "";
    return {
      id: c.id,
      date_created: c.date_created,
      status: c.status,
      requester: userMap.get(reqId) ?? { id: reqId, first_name: "Member", last_name: "", avatar: null },
      recipient: userMap.get(recId) ?? { id: recId, first_name: "Member", last_name: "", avatar: null },
    };
  });

  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accepted:         hydrated.filter((c: any) => c.status === "accepted"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pending_sent:     hydrated.filter((c: any) => c.status === "pending" && c.requester.id === me.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pending_received: hydrated.filter((c: any) => c.status === "pending" && c.recipient.id === me.id),
    my_id:            me.id,
  });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=id,first_name,last_name`, {
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
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
  );
  const existingJson = await existing.json();
  if (existingJson.data?.length > 0) {
    return NextResponse.json({ error: "Connection already exists", existing: existingJson.data[0] }, { status: 409 });
  }

  // Use admin token to create so the record is always writable
  const res = await fetch(`${DIRECTUS_URL}/items/user_connections`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requester: me.id, recipient: recipient_id, status: "pending" }),
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to send request" }, { status: res.status });
  const json = await res.json();

  // ── Fire-and-forget: email the recipient ──
  (async () => {
    try {
      const recipientRes = await fetch(
        `${DIRECTUS_URL}/users/${recipient_id}?fields[]=email,first_name`,
        { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
      );
      if (!recipientRes.ok) return;
      const { data: recipient } = await recipientRes.json();
      if (!recipient?.email) return;

      const senderName = `${me.first_name} ${me.last_name ?? ""}`.trim();
      const recipientFirst = recipient.first_name ?? "there";

      await resend.emails.send({
        from: "Blacksky Up <info@blackskymedia.org>",
        to: recipient.email,
        subject: `${senderName} sent you a connection request`,
        html: emailHtml(`
          <h2 style="font-size:22px;color:#1a1a2e;margin:0 0 16px;">You have a new connection request</h2>
          <p style="color:#555;line-height:1.7;margin:0 0 8px;">
            Hi ${recipientFirst},
          </p>
          <p style="color:#555;line-height:1.7;margin:0 0 20px;">
            <strong>${senderName}</strong> wants to connect with you on Blacksky Up.
            Visit the People page to accept or decline their request.
          </p>
          ${ctaButton(`${SITE_URL}/portal/people`, "View Request")}
          <p style="color:#888;font-size:14px;line-height:1.6;margin:16px 0 0;">
            If you don't recognise this person, you can safely decline.
          </p>
        `),
      });
    } catch (e) {
      console.error("[connections POST] email error:", e);
    }
  })();

  return NextResponse.json({ data: json.data }, { status: 201 });
}
