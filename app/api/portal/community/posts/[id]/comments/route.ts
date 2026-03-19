import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const DIRECTUS_TOKEN = process.env.DIRECTUS_API_TOKEN!;

type RawComment = Record<string, unknown>;

/**
 * If `author` is a bare UUID string (Directus didn't expand the relation),
 * batch-fetch user details with the admin token and merge them in.
 */
async function hydrateCommentAuthors(comments: RawComment[]): Promise<RawComment[]> {
  const bareIds = new Set<string>();
  for (const c of comments) {
    if (typeof c.author === "string" && c.author.length > 0) {
      bareIds.add(c.author);
    }
  }
  if (bareIds.size === 0) return comments;

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

  return comments.map(c => {
    if (typeof c.author === "string") {
      const user = userMap.get(c.author);
      return {
        ...c,
        author: user ?? { id: c.author, first_name: "Member", last_name: "", avatar: null },
      };
    }
    return c;
  });
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

  // Use admin token so author fields resolve when possible
  const res = await fetch(
    `${DIRECTUS_URL}/items/community_comments` +
    `?fields[]=id,date_created,content,author.id,author.first_name,author.last_name,author.avatar` +
    `&filter[post_id][_eq]=${id}&sort[]=date_created`,
    { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }, cache: "no-store" }
  );
  if (!res.ok) return NextResponse.json({ error: "Failed to fetch comments" }, { status: res.status });
  const json = await res.json();

  // Hydrate bare UUID authors with user details
  const comments = await hydrateCommentAuthors(json.data ?? []);
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
  const commentId = json.data?.id;

  // Re-fetch with expanded author
  const fullRes = await fetch(
    `${DIRECTUS_URL}/items/community_comments/${commentId}` +
    `?fields[]=id,date_created,content,author.id,author.first_name,author.last_name,author.avatar`,
    { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }, cache: "no-store" }
  );

  let commentData: RawComment;
  if (fullRes.ok) {
    const fullJson = await fullRes.json();
    commentData = fullJson.data ?? json.data;
  } else {
    commentData = json.data;
  }

  // If author is still a bare UUID, attach user info from the /users/me call
  if (typeof commentData.author === "string") {
    commentData = {
      ...commentData,
      author: { id: me.id, first_name: me.first_name, last_name: me.last_name ?? "", avatar: me.avatar ?? null },
    };
  }

  return NextResponse.json({ data: commentData }, { status: 201 });
}
