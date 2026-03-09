import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

/** Verify admin and return the user's own Directus token (Administrator role = full access). */
async function getAdminToken(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("directus_token")?.value;
  const role  = req.cookies.get("portal_role")?.value;
  if (!token || role !== "admin") return null;
  return token;
}

export async function GET(req: NextRequest) {
  const token = await getAdminToken(req);
  if (!token) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // Run all counts in parallel
  const [usersRes, classesRes, postsRes, connectionsRes] = await Promise.all([
    fetch(`${DIRECTUS_URL}/users?filter[status][_in][]=active&filter[status][_in][]=suspended&aggregate[count]=id`,
      { headers, cache: "no-store" }),
    fetch(`${DIRECTUS_URL}/items/classes?aggregate[count]=id`,
      { headers, cache: "no-store" }),
    fetch(`${DIRECTUS_URL}/items/community_posts?aggregate[count]=id`,
      { headers, cache: "no-store" }),
    fetch(`${DIRECTUS_URL}/items/user_connections?aggregate[count]=id`,
      { headers, cache: "no-store" }),
  ]);

  // Fetch role breakdown
  const rolesRes = await fetch(
    `${DIRECTUS_URL}/roles?fields[]=id,name`,
    { headers, cache: "no-store" }
  );
  const rolesJson  = rolesRes.ok  ? await rolesRes.json()  : { data: [] };
  const roles: { id: string; name: string }[] = rolesJson.data ?? [];

  // Count users per role
  const roleCountsRaw = await Promise.all(
    roles.map(async (r) => {
      const res = await fetch(
        `${DIRECTUS_URL}/users?filter[role][_eq]=${r.id}&filter[status][_eq]=active&aggregate[count]=id`,
        { headers, cache: "no-store" }
      );
      const json = res.ok ? await res.json() : { data: [{ count: { id: 0 } }] };
      return { name: r.name.toLowerCase(), count: Number(json.data?.[0]?.count?.id ?? 0) };
    })
  );

  const usersJson       = usersRes.ok       ? await usersRes.json()       : { data: [{ count: { id: 0 } }] };
  const classesJson     = classesRes.ok     ? await classesRes.json()     : { data: [{ count: { id: 0 } }] };
  const postsJson       = postsRes.ok       ? await postsRes.json()       : { data: [{ count: { id: 0 } }] };
  const connectionsJson = connectionsRes.ok ? await connectionsRes.json() : { data: [{ count: { id: 0 } }] };

  const roleCounts: Record<string, number> = {};
  for (const r of roleCountsRaw) roleCounts[r.name] = r.count;

  return NextResponse.json({
    total_users:    Number(usersJson.data?.[0]?.count?.id ?? 0),
    students:       roleCounts["student"]      ?? 0,
    teachers:       roleCounts["teacher"]      ?? 0,
    applicants:     roleCounts["applicant"]    ?? 0,
    total_classes:  Number(classesJson.data?.[0]?.count?.id ?? 0),
    total_posts:    Number(postsJson.data?.[0]?.count?.id ?? 0),
    connections:    Number(connectionsJson.data?.[0]?.count?.id ?? 0),
  });
}
