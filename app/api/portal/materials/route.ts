import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getToken(req: NextRequest): string | null {
  return req.cookies.get("directus_token")?.value ?? null;
}

/**
 * POST /api/portal/materials
 * Creates a new class material. Requires teacher auth.
 * Body: { class_id, title, type, description?, url? }
 */
export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { class_id, title, type, description, url } = body;

    if (!class_id || !title || !type) {
      return NextResponse.json({ message: "class_id, title, and type are required." }, { status: 400 });
    }

    const res = await fetch(`${DIRECTUS_URL}/items/class_materials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        class_id,
        title,
        type,
        description: description || null,
        url: url || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json(
        { message: err.errors?.[0]?.message || "Failed to create material." },
        { status: 400 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Server error." }, { status: 500 });
  }
}

/**
 * DELETE /api/portal/materials
 * Deletes a class material by ID. Requires teacher auth.
 * Body: { id }
 */
export async function DELETE(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ message: "Material ID required." }, { status: 400 });

    const res = await fetch(`${DIRECTUS_URL}/items/class_materials/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok && res.status !== 204) {
      return NextResponse.json({ message: "Failed to delete material." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Server error." }, { status: 500 });
  }
}
