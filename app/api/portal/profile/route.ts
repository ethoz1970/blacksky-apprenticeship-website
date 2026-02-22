import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

/**
 * PATCH /api/portal/profile
 * Updates the current user's own profile via Directus /users/me.
 * Allowed fields: first_name, last_name, avatar (file UUID).
 */
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // Only allow safe profile fields — never accept role, email, or other sensitive fields
    const patch: Record<string, string | null> = {};
    if ("first_name" in body) patch.first_name = body.first_name || null;
    if ("last_name" in body) patch.last_name = body.last_name || null;
    if ("avatar" in body) patch.avatar = body.avatar || null;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ message: "No fields to update." }, { status: 400 });
    }

    const res = await fetch(`${DIRECTUS_URL}/users/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: err.errors?.[0]?.message || "Profile update failed." },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: "Server error." }, { status: 500 });
  }
}
