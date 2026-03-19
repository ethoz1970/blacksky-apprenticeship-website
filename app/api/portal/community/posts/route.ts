import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const DIRECTUS_TOKEN = process.env.DIRECTUS_API_TOKEN!;

/* ------------------------------------------------------------------ */
/*  Helpers — hydrate bare-UUID fields into the objects the UI expects */
/* ------------------------------------------------------------------ */

type RawPost = Record<string, unknown>;
type UserObj = { id: string; first_name: string; last_name: string; avatar: string | null };
type FileObj = { id: string; filename_download: string; type?: string };

/**
 * Batch-fetch Directus users by a set of UUIDs.
 * Returns a map of userId → user object.
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
 * Batch-fetch Directus files by a set of UUIDs.
 * Returns a map of fileId → file object.
 */
async function fetchFiles(ids: Set<string>): Promise<Map<string, FileObj>> {
  const map = new Map<string, FileObj>();
  if (ids.size === 0) return map;

  const idList = [...ids];
  const filter = idList.map((id, i) => `filter[id][_in][${i}]=${id}`).join("&");
  const res = await fetch(
    `${DIRECTUS_URL}/files?${filter}&fields[]=id,filename_download,type&limit=${idList.length}`,
    { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }, cache: "no-store" }
  );
  if (res.ok) {
    const { data: files } = await res.json();
    for (const f of files ?? []) map.set(f.id, f);
  }
  return map;
}

/**
 * Take the raw posts (where author/image/attachment are bare UUID strings)
 * and replace them with the full objects the frontend expects.
 */
async function hydratePosts(posts: RawPost[]): Promise<RawPost[]> {
  const authorIds = new Set<string>();
  const fileIds = new Set<string>();

  for (const p of posts) {
    if (typeof p.author === "string" && p.author) authorIds.add(p.author);
    if (typeof p.image === "string" && p.image) fileIds.add(p.image);
    if (typeof p.attachment === "string" && p.attachment) fileIds.add(p.attachment);
  }

  const [userMap, fileMap] = await Promise.all([
    fetchUsers(authorIds),
    fetchFiles(fileIds),
  ]);

  return posts.map(p => ({
    ...p,
    author:
      typeof p.author === "string"
        ? userMap.get(p.author) ?? { id: p.author, first_name: "Member", last_name: "", avatar: null }
        : p.author ?? { id: "", first_name: "Member", last_name: "", avatar: null },
    image:
      typeof p.image === "string"
        ? fileMap.get(p.image) ?? null
        : p.image ?? null,
    attachment:
      typeof p.attachment === "string"
        ? fileMap.get(p.attachment) ?? null
        : p.attachment ?? null,
  }));
}

/* ------------------------------------------------------------------ */
/*  Route handlers                                                     */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the user is logged in
  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=id`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scope   = searchParams.get("scope") ?? "global";
  const classId = searchParams.get("class_id");
  const page    = parseInt(searchParams.get("page") ?? "1");
  const limit   = 20;
  const offset  = (page - 1) * limit;

  const filter = scope === "class" && classId
    ? `&filter[scope][_eq]=class&filter[class_id][_eq]=${classId}`
    : `&filter[scope][_eq]=global`;

  // Request flat fields only — author, image, attachment come back as UUID strings.
  // We hydrate them into full objects afterwards.
  const fields = [
    "id", "date_created", "content", "scope", "class_id",
    "link_url", "link_title", "link_description", "link_image",
    "author", "image", "attachment",
  ].map(f => `fields[]=${f}`).join("&");

  const res = await fetch(
    `${DIRECTUS_URL}/items/community_posts?${fields}${filter}&sort[]=-date_created&limit=${limit}&offset=${offset}&meta=total_count`,
    { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }, cache: "no-store" }
  );

  if (!res.ok) return NextResponse.json({ error: "Failed to fetch posts" }, { status: res.status });
  const json = await res.json();

  const posts = await hydratePosts(json.data ?? []);
  return NextResponse.json({ data: posts, meta: json.meta });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Authenticate and get current user info
  const meRes = await fetch(
    `${DIRECTUS_URL}/users/me?fields[]=id,first_name,last_name,avatar`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await meRes.json();

  const body = await req.json();
  const { content, scope, class_id, image, attachment, link_url, link_title, link_description, link_image } = body;

  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  // Use admin token to create the post
  const res = await fetch(`${DIRECTUS_URL}/items/community_posts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      author: me.id,
      content: content.trim(),
      scope: scope ?? "global",
      class_id: class_id ?? null,
      image: image ?? null,
      attachment: attachment ?? null,
      link_url: link_url ?? null,
      link_title: link_title ?? null,
      link_description: link_description ?? null,
      link_image: link_image ?? null,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Failed to create community post:", err);
    return NextResponse.json({ error: "Failed to create post" }, { status: res.status });
  }
  const json = await res.json();
  const raw = json.data;

  // Build the full post object the frontend expects using data we already have
  const fileMap = new Map<string, FileObj>();
  const imageId = typeof raw.image === "string" ? raw.image : null;
  const attachId = typeof raw.attachment === "string" ? raw.attachment : null;

  if (imageId || attachId) {
    const ids = new Set<string>();
    if (imageId) ids.add(imageId);
    if (attachId) ids.add(attachId);
    const fMap = await fetchFiles(ids);
    for (const [k, v] of fMap) fileMap.set(k, v);
  }

  const postData = {
    id: raw.id,
    date_created: raw.date_created,
    content: raw.content,
    scope: raw.scope,
    class_id: raw.class_id,
    link_url: raw.link_url ?? null,
    link_title: raw.link_title ?? null,
    link_description: raw.link_description ?? null,
    link_image: raw.link_image ?? null,
    author: { id: me.id, first_name: me.first_name, last_name: me.last_name ?? "", avatar: me.avatar ?? null },
    image: imageId ? fileMap.get(imageId) ?? null : null,
    attachment: attachId ? fileMap.get(attachId) ?? null : null,
  };

  return NextResponse.json({ data: postData }, { status: 201 });
}
