import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

/**
 * POST /api/portal/password
 * Changes the logged-in user's password.
 * Verifies current_password by re-authenticating, then patches the new one.
 *
 * Body: { current_password, new_password }
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { current_password, new_password } = await req.json();

    if (!current_password || !new_password) {
      return NextResponse.json(
        { message: "Current and new passwords are required." },
        { status: 400 }
      );
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { message: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (current_password === new_password) {
      return NextResponse.json(
        { message: "New password must be different from your current password." },
        { status: 400 }
      );
    }

    // Fetch the user's email so we can verify the current password
    const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=email`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!meRes.ok) return NextResponse.json({ message: "Session expired." }, { status: 401 });

    const { data: me } = await meRes.json();
    const email: string = me?.email;
    if (!email) return NextResponse.json({ message: "Could not retrieve account info." }, { status: 500 });

    // Verify current password via re-auth
    const authRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: current_password }),
    });

    if (!authRes.ok) {
      return NextResponse.json({ message: "Current password is incorrect." }, { status: 400 });
    }

    // Apply the new password
    const patchRes = await fetch(`${DIRECTUS_URL}/users/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password: new_password }),
    });

    if (!patchRes.ok) {
      const err = await patchRes.json().catch(() => ({}));
      return NextResponse.json(
        { message: err.errors?.[0]?.message || "Failed to update password." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Server error." }, { status: 500 });
  }
}
