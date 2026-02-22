import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

/**
 * GET /api/portal/debug
 * Temporary: shows exactly what the student token can fetch.
 * Remove after debugging.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "no token cookie" });

  const results: Record<string, unknown> = { token_prefix: token.slice(0, 8) };

  // Step 1: /users/me with class_id
  const meRes = await fetch(
    `${DIRECTUS_URL}/users/me?fields[]=id,first_name,last_name,class_id,avatar`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  results.me_status = meRes.status;
  const meJson = await meRes.json();
  results.me = meJson;

  const classId = meJson?.data?.class_id;
  results.class_id_from_me = classId;

  if (!classId) {
    results.note = "class_id is null/undefined — class fetch skipped";
    return NextResponse.json(results);
  }

  // Step 2: fetch the class
  const url =
    `${DIRECTUS_URL}/items/classes/${classId}` +
    `?fields[]=id,name,description,discipline` +
    `&fields[]=teacher.first_name,teacher.last_name` +
    `&fields[]=materials.id,materials.title`;

  const classRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  results.class_status = classRes.status;
  results.class_url = url;
  results.class = await classRes.json();

  return NextResponse.json(results, {
    headers: { "Content-Type": "application/json" },
  });
}
