import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

/** Verify admin and return the user's own Directus token (Administrator role = full access). */
async function getAdminToken(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("directus_token")?.value;
  const role  = req.cookies.get("portal_role")?.value;
  if (!token || role !== "admin") return null;
  return token;
}

/** GET /api/portal/admin/users?role=student|teacher|applicant|all */
export async function GET(req: NextRequest) {
  const token = await getAdminToken(req);
  if (!token) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const roleFilter = req.nextUrl.searchParams.get("role") ?? "all";

  // Fetch all roles to map names → IDs
  const rolesRes = await fetch(`${DIRECTUS_URL}/roles?fields[]=id,name`, {
    headers: authHeaders(token), cache: "no-store",
  });
  const rolesJson = rolesRes.ok ? await rolesRes.json() : { data: [] };
  const roles: { id: string; name: string }[] = rolesJson.data ?? [];

  const roleMap: Record<string, string> = {};
  for (const r of roles) roleMap[r.name.toLowerCase()] = r.id;

  const fields = [
    "id", "first_name", "last_name", "email",
    "status", "role.id", "role.name",
    "avatar", "title", "last_access", "date_created",
  ].map(f => `fields[]=${f}`).join("&");

  // Use proper array notation for _in filters (Directus v10 requirement)
  let filterStr =
    `&filter[status][_in][]=active` +
    `&filter[status][_in][]=suspended` +
    `&filter[status][_in][]=invited`;

  if (roleFilter !== "all" && roleMap[roleFilter]) {
    // Filter by specific role — show all non-archived users in that role
    filterStr =
      `&filter[role][_eq]=${roleMap[roleFilter]}` +
      `&filter[status][_nin][]=archived`;
  }

  const res = await fetch(
    `${DIRECTUS_URL}/users?${fields}${filterStr}&sort[]=first_name&limit=500`,
    { headers: authHeaders(token), cache: "no-store" }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: "Failed to fetch users", detail: err }, { status: res.status });
  }
  const json = await res.json();

  return NextResponse.json({ data: json.data ?? [], roleMap });
}

/** PATCH /api/portal/admin/users — update a user's role, class_id, or status */
export async function PATCH(req: NextRequest) {
  const token = await getAdminToken(req);
  if (!token) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { userId, role_id, class_id, status } = body;

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (role_id  !== undefined) update.role     = role_id;
  if (class_id !== undefined) update.class_id = class_id;
  if (status   !== undefined) update.status   = status;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const res = await fetch(`${DIRECTUS_URL}/users/${userId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(update),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: "Failed to update user", detail: err }, { status: res.status });
  }
  const json = await res.json();
  return NextResponse.json({ data: json.data });
}
