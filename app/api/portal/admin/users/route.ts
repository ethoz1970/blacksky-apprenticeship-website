import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const ADMIN_TOKEN  = process.env.DIRECTUS_API_TOKEN!;

function adminHeaders() {
  return { Authorization: `Bearer ${ADMIN_TOKEN}`, "Content-Type": "application/json" };
}

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("directus_token")?.value;
  const role  = req.cookies.get("portal_role")?.value;
  if (!token || role !== "admin") return false;
  return true;
}

/** GET /api/portal/admin/users?role=student|teacher|applicant|all */
export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const roleFilter = req.nextUrl.searchParams.get("role") ?? "all";

  // Get all roles first to map names → IDs
  const rolesRes = await fetch(`${DIRECTUS_URL}/roles?fields[]=id,name`, {
    headers: adminHeaders(), cache: "no-store",
  });
  const rolesJson = rolesRes.ok ? await rolesRes.json() : { data: [] };
  const roles: { id: string; name: string }[] = rolesJson.data ?? [];

  const roleMap: Record<string, string> = {};
  for (const r of roles) roleMap[r.name.toLowerCase()] = r.id;

  const fields = [
    "id", "first_name", "last_name", "email",
    "status", "role.id", "role.name",
    "avatar", "title", "last_access", "date_created",
    "class_id",
  ].map(f => `fields[]=${f}`).join("&");

  let filterStr = `&filter[status][_in]=active,suspended,invited`;
  if (roleFilter !== "all" && roleMap[roleFilter]) {
    filterStr = `&filter[role][_eq]=${roleMap[roleFilter]}&filter[status][_neq]=archived`;
  }

  const res = await fetch(
    `${DIRECTUS_URL}/users?${fields}${filterStr}&sort[]=first_name&limit=200`,
    { headers: adminHeaders(), cache: "no-store" }
  );

  if (!res.ok) return NextResponse.json({ error: "Failed to fetch users" }, { status: res.status });
  const json = await res.json();

  // Attach classes info for students
  const classesRes = await fetch(
    `${DIRECTUS_URL}/items/classes?fields[]=id,name,discipline&limit=-1`,
    { headers: adminHeaders(), cache: "no-store" }
  );
  const classes = classesRes.ok ? (await classesRes.json()).data ?? [] : [];

  return NextResponse.json({ data: json.data ?? [], classes, roleMap });
}

/** PATCH /api/portal/admin/users/[id] — update role or class_id or status */
export async function PATCH(req: NextRequest) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { userId, role_id, class_id, status } = body;

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (role_id    !== undefined) update.role     = role_id;
  if (class_id   !== undefined) update.class_id = class_id;
  if (status     !== undefined) update.status   = status;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const res = await fetch(`${DIRECTUS_URL}/users/${userId}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(update),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: "Failed to update user", detail: err }, { status: res.status });
  }
  const json = await res.json();
  return NextResponse.json({ data: json.data });
}
