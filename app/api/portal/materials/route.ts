import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

function getToken(req: NextRequest): string | null {
  return req.cookies.get("directus_token")?.value ?? null;
}

/**
 * POST /api/portal/materials
 * Creates a new class material. Requires teacher auth.
 * Body: { class_id, title, type, description?, url?, file? }
 */
export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { class_id, title, type, description, url, file } = body;

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
        file: file || null,
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
 * PATCH /api/portal/materials
 * Updates an existing material. Requires teacher auth.
 * Body: { id, title, type, description?, url?, file?, oldFileId? }
 *
 * If oldFileId is provided and differs from the new file, the old file
 * is deleted from Directus (teacher must own it — perm 27 enforces this).
 */
export async function PATCH(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, title, type, description, url, file, oldFileId } = body;

    if (!id || !title || !type) {
      return NextResponse.json({ message: "id, title, and type are required." }, { status: 400 });
    }

    // Update the material record
    const res = await fetch(`${DIRECTUS_URL}/items/class_materials/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        type,
        description: description || null,
        url: url || null,
        file: file || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json(
        { message: err.errors?.[0]?.message || "Failed to update material." },
        { status: 400 }
      );
    }

    // If the file was replaced or removed, delete the old file from Directus.
    // The DELETE permission (perm 27) limits this to files the teacher uploaded.
    if (oldFileId && oldFileId !== file) {
      await fetch(`${DIRECTUS_URL}/files/${oldFileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {
        // Non-fatal — file may already be gone or belong to someone else
      });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: "Server error." }, { status: 500 });
  }
}

/**
 * DELETE /api/portal/materials
 * Deletes a class material by ID. Requires teacher auth.
 * Body: { id, fileId? }
 *
 * If fileId is provided, the associated Directus file is also deleted.
 */
export async function DELETE(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { id, fileId } = await req.json();
    if (!id) return NextResponse.json({ message: "Material ID required." }, { status: 400 });

    const res = await fetch(`${DIRECTUS_URL}/items/class_materials/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok && res.status !== 204) {
      return NextResponse.json({ message: "Failed to delete material." }, { status: 400 });
    }

    // Also delete the attached file if present
    if (fileId) {
      await fetch(`${DIRECTUS_URL}/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {
        // Non-fatal
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Server error." }, { status: 500 });
  }
}
