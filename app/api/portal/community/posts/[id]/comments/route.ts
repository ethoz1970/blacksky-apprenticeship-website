import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const DIRECTUS_TOKEN = process.env.DIRECTUS_API_TOKEN!;

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

  // Use admin token so author relational fields (name, avatar) always resolve
  const res = await fetch(
    `${DIRECTUS_URL}/items/community_comments` +
    `?fields[]=id,date_created,content,author.id,author.first_name,author.last_name,author.avatar` +
    `&filter[post_id][_eq]=${id}&sort[]=date_created`,
    { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }, cache: "no-store" }
  );
  if (!res.ok) return NextResponse.json({ error: "Failed to fetch comments" }, { status: res.status });
  const json = await res.json();
  return NextResponse.json({ data: json.data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Authenticate the user
  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=id`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await meRes.json();

  const { id } = await params;
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  // Use admin token to create comment so all fields are writable
  const res = await fetch(`${DIRECTUS_URL}/items/community_comments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ post_id: parseInt(id), author: me.id, content: content.trim() }),
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to post comment" }, { status: res.status });
  const json = await res.json();
  const commentId = json.data?.id;

  // Re-fetch with expanded author fields so the client gets the full comment object
  const fullRes = await fetch(
    `${DIRECTUS_URL}/items/community_comments/${commentId}` +
    `?fields[]=id,date_created,content,author.id,author.first_name,author.last_name,author.avatar`,
    { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }, cache: "no-store" }
  );
  const fullJson = fullRes.ok ? await fullRes.json() : json;
  return NextResponse.json({ data: fullJson.data ?? json.data }, { status: 201 });
}
