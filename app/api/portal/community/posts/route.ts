import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const DIRECTUS_TOKEN = process.env.DIRECTUS_API_TOKEN!;

export async function GET(req: NextRequest) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify the user is logged in (lightweight check)
  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=id`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scope    = searchParams.get("scope") ?? "global"; // "global" | "class"
  const classId  = searchParams.get("class_id");
  const page     = parseInt(searchParams.get("page") ?? "1");
  const limit    = 20;
  const offset   = (page - 1) * limit;

  const filter = scope === "class" && classId
    ? `&filter[scope][_eq]=class&filter[class_id][_eq]=${classId}`
    : `&filter[scope][_eq]=global`;

  const fields = [
    "id", "date_created", "content", "scope", "class_id",
    "link_url", "link_title", "link_description", "link_image",
    "author.id", "author.first_name", "author.last_name", "author.avatar",
    "image.id", "image.filename_download", "image.type",
    "attachment.id", "attachment.filename_download", "attachment.type",
  ].map(f => `fields[]=${f}`).join("&");

  // Use admin token so relational fields (author name, avatar, images) always resolve
  // regardless of the student/teacher role's permissions on directus_users / directus_files
  const res = await fetch(
    `${DIRECTUS_URL}/items/community_posts?${fields}${filter}&sort[]=-date_created&limit=${limit}&offset=${offset}&meta=total_count`,
    { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }, cache: "no-store" }
  );

  if (!res.ok) return NextResponse.json({ error: "Failed to fetch posts" }, { status: res.status });
  const json = await res.json();
  return NextResponse.json({ data: json.data ?? [], meta: json.meta });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get current user id (still use their token so we know who they are)
  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=id`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await meRes.json();

  const body = await req.json();
  const { content, scope, class_id, image, attachment, link_url, link_title, link_description, link_image } = body;

  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  // Use admin token to create the post so image/attachment M2O fields are always written
  // (student/teacher roles may lack create permissions on relational fields)
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
  const postId = json.data?.id;

  // Re-fetch with expanded fields using admin token so all relations resolve
  const fullFields = [
    "id", "date_created", "content", "scope", "class_id",
    "link_url", "link_title", "link_description", "link_image",
    "author.id", "author.first_name", "author.last_name", "author.avatar",
    "image.id", "image.filename_download",
    "attachment.id", "attachment.filename_download",
  ].map(f => `fields[]=${f}`).join("&");

  const fullRes = await fetch(
    `${DIRECTUS_URL}/items/community_posts/${postId}?${fullFields}`,
    { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }, cache: "no-store" }
  );
  const fullJson = fullRes.ok ? await fullRes.json() : json;
  return NextResponse.json({ data: fullJson.data ?? json.data }, { status: 201 });
}
