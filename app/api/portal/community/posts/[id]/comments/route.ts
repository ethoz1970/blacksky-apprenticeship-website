import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const DIRECTUS_TOKEN = process.env.DIRECTUS_API_TOKEN!;

type UserObj = { id: string; first_name: string; last_name: string; avatar: string | null };
type RawComment = Record<string, unknown>;

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
    { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }, cache: "no-store" }
  );
  if (res.ok) {
    const { data: users } = await res.json();
    for (const u of users ?? []) map.set(u.id, u);
  }
  return map;
}

/**
 * Take raw comments (where author is a bare UUID) and replace with full user objects.
 */
async function hydrateComments(comments: RawComment[]): Promise<RawComment[]> {
  const authorIds = new Set<string>();
  for (const c of comments) {
    if (typeof c.author === "string" && c.author) authorIds.add(c.author);
  }

  const userMap = await fetchUsers(authorIds);

  return comments.map(c => ({
    ...c,
    author:
      typeof c.author === "string"
        ? userMap.get(c.author) ?? { id: c.author, first_name: "Member", last_name: "", avatar: null }
        : c.author ?? { id: "", first_name: "Member", last_name: "", avatar: null },
  }));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the user is logged in
  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=id`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Request flat fields — author comes back as a UUID string
  const res = await fetch(
    `${DIRECTUS_URL}/items/community_comments` +
    `?fields[]=id,date_created,content,author` +
    `&filter[post_id][_eq]=${id}&sort[]=date_created`,
    { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }, cache: "no-store" }
  );
  if (!res.ok) return NextResponse.json({ error: "Failed to fetch comments" }, { status: res.status });
  const json = await res.json();

  const comments = await hydrateComments(json.data ?? []);
  return NextResponse.json({ data: comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Authenticate and get user info
  const meRes = await fetch(
    `${DIRECTUS_URL}/users/me?fields[]=id,first_name,last_name,avatar`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await meRes.json();

  const { id } = await params;
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  // Use admin token to create comment
  const res = await fetch(`${DIRECTUS_URL}/items/community_comments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ post_id: parseInt(id), author: me.id, content: content.trim() }),
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to post comment" }, { status: res.status });
  const json = await res.json();

  // Build full comment object with the user info we already have
  const commentData = {
    id: json.data.id,
    date_created: json.data.date_created,
    content: json.data.content,
    author: { id: me.id, first_name: me.first_name, last_name: me.last_name ?? "", avatar: me.avatar ?? null },
  };

  return NextResponse.json({ data: commentData }, { status: 201 });
}
