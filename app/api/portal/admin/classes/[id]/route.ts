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

/** PATCH /api/portal/admin/classes/[id] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json();
  const { name, description, discipline, teacher } = body;

  const update: Record<string, unknown> = {};
  if (name        !== undefined) update.name        = name?.trim();
  if (description !== undefined) update.description = description?.trim() ?? "";
  if (discipline  !== undefined) update.discipline  = discipline;
  if (teacher     !== undefined) update.teacher     = teacher ?? null;

  const res = await fetch(`${DIRECTUS_URL}/items/classes/${id}`, {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify(update),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: "Failed to update class", detail: err }, { status: res.status });
  }
  const json = await res.json();
  return NextResponse.json({ data: json.data });
}

/** DELETE /api/portal/admin/classes/[id] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const res = await fetch(`${DIRECTUS_URL}/items/classes/${id}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });

  if (!res.ok && res.status !== 204) {
    return NextResponse.json({ error: "Failed to delete class" }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
