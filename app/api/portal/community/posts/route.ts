import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const DIRECTUS_TOKEN = process.env.DIRECTUS_API_TOKEN!;

/**
 * If Directus returns `author` as a bare UUID string (happens when the field
 * isn't a fully-configured M2O relation, or when permissions prevent expansion),
 * look up the user details with the admin token and merge them in.
 */
type RawPost = Record<string, unknown>;

async function hydrateAuthors(posts: RawPost[]): Promise<RawPost[]> {
  // Collect any bare-UUID author values that need resolving
  const bareIds = new Set<string>();
  for (const p of posts) {
    if (typeof p.author === "string" && p.author.length > 0) {
      bareIds.add(p.author);
    }
  }
  if (bareIds.size === 0) return posts; // all authors already expanded

  // Batch-fetch user details via admin token
  const idList = [...bareIds];
  const filterParts = idList.map((id, i) => `filter[id][_in][${i}]=${id}`).join("&");
  const userRes = await fetch(
    `${DIRECTUS_URL}/users?${filterParts}&fields[]=id,first_name,last_name,avatar&limit=${idList.length}`,
    { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }, cache: "no-store" }
  );

  const userMap = new Map<string, { id: string; first_name: string; last_name: string; avatar: string | null }>();
  if (userRes.ok) {
    const { data: users } = await userRes.json();
    for (const u of users ?? []) {
      userMap.set(u.id, u);
    }
  }

  // Merge author objects back into posts
  return posts.map(p => {
    if (typeof p.author === "string") {
      const user = userMap.get(p.author);
      return {
        ...p,
        author: user ?? { id: p.author, first_name: "Member", last_name: "", avatar: null },
      };
    }
    return p;
  });
}

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
  const scope    = searchParams.get("scope") ?? "global";
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

  // Use admin token so relational fields always resolve when possible
  const res = await fetch(
    `${DIRECTUS_URL}/items/community_posts?${fields}${filter}&sort[]=-date_created&limit=${limit}&offset=${offset}&meta=total_count`,
    { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }, cache: "no-store" }
  );

  if (!res.ok) return NextResponse.json({ error: "Failed to fetch posts" }, { status: res.status });
  const json = await res.json();

  // If author came back as a bare UUID, hydrate with user details
  const posts = await hydrateAuthors(json.data ?? []);

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

  // Use admin token to create the post so all fields are writable
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

  // Re-fetch with expanded fields using admin token
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

  let postData: RawPost;
  if (fullRes.ok) {
    const fullJson = await fullRes.json();
    postData = fullJson.data ?? json.data;
  } else {
    postData = json.data;
  }

  // If author is still a bare UUID after re-fetch, manually attach the user info
  // we already have from the /users/me call
  if (typeof postData.author === "string") {
    postData = {
      ...postData,
      author: { id: me.id, first_name: me.first_name, last_name: me.last_name ?? "", avatar: me.avatar ?? null },
    };
  }

  return NextResponse.json({ data: postData }, { status: 201 });
}
