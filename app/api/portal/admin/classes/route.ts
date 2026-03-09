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

/** GET /api/portal/admin/classes */
export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [classesRes, teachersRes] = await Promise.all([
    fetch(
      `${DIRECTUS_URL}/items/classes` +
      `?fields[]=id,name,description,discipline` +
      `&fields[]=teacher.id,teacher.first_name,teacher.last_name` +
      `&fields[]=students.id,students.first_name,students.last_name` +
      `&sort[]=name&limit=-1`,
      { headers: adminHeaders(), cache: "no-store" }
    ),
    fetch(
      `${DIRECTUS_URL}/users?filter[role][_eq]=teacher&fields[]=id,first_name,last_name&sort[]=first_name&limit=100`,
      { headers: adminHeaders(), cache: "no-store" }
    ),
  ]);

  // Get teacher role ID dynamically
  const rolesRes = await fetch(`${DIRECTUS_URL}/roles?fields[]=id,name`, {
    headers: adminHeaders(), cache: "no-store",
  });
  const rolesJson = rolesRes.ok ? await rolesRes.json() : { data: [] };
  const roles: { id: string; name: string }[] = rolesJson.data ?? [];
  const teacherRoleId = roles.find(r => r.name.toLowerCase() === "teacher")?.id ?? "";

  // Re-fetch teachers using actual role ID
  const teachersResActual = await fetch(
    `${DIRECTUS_URL}/users?filter[role][_eq]=${teacherRoleId}&fields[]=id,first_name,last_name&sort[]=first_name&limit=100`,
    { headers: adminHeaders(), cache: "no-store" }
  );

  void teachersRes;

  if (!classesRes.ok) return NextResponse.json({ error: "Failed to fetch classes" }, { status: classesRes.status });
  const classesJson = await classesRes.json();
  const teachersJson = teachersResActual.ok ? await teachersResActual.json() : { data: [] };

  return NextResponse.json({
    data: classesJson.data ?? [],
    teachers: teachersJson.data ?? [],
  });
}

/** POST /api/portal/admin/classes — create a new class */
export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, description, discipline, teacher } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!discipline)   return NextResponse.json({ error: "Discipline required" }, { status: 400 });

  const res = await fetch(`${DIRECTUS_URL}/items/classes`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({
      name: name.trim(),
      description: description?.trim() ?? "",
      discipline,
      teacher: teacher ?? null,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: "Failed to create class", detail: err }, { status: res.status });
  }
  const json = await res.json();
  return NextResponse.json({ data: json.data }, { status: 201 });
}
