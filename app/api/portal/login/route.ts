import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

/**
 * POST /api/portal/login
 * Authenticates a user against Directus and sets an httpOnly auth cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
    }

    // Authenticate against Directus
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!loginRes.ok) {
      return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
    }

    const { data: authData } = await loginRes.json();
    const { access_token, refresh_token } = authData;

    // Fetch user info to determine role
    const meRes = await fetch(
      `${DIRECTUS_URL}/users/me?fields[]=id,first_name,last_name,role.name`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const meJson = await meRes.json();
    const user = meJson.data;
    const roleName: string = (user?.role?.name || "").toLowerCase();

    // Determine redirect path
    let redirectTo = "/portal/login";
    if (roleName === "teacher") redirectTo = "/portal/teacher";
    else if (roleName === "student") redirectTo = "/portal/student";
    else if (roleName === "applicant") redirectTo = "/portal/applicant";

    const response = NextResponse.json({
      success: true,
      redirectTo,
      user: {
        id: user?.id,
        first_name: user?.first_name,
        last_name: user?.last_name,
        role: roleName,
      },
    });

    // Set httpOnly auth cookie (24h)
    response.cookies.set("directus_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    // Store role so portal pages don't need to re-fetch it from Directus
    // (students lack permission to expand the role relation via their own token)
    response.cookies.set("portal_role", roleName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    // Store first name for homepage greeting (avoids an extra Directus fetch per page view)
    if (user?.first_name) {
      response.cookies.set("portal_name", user.first_name, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
        path: "/",
      });
    }

    if (refresh_token) {
      response.cookies.set("directus_refresh", refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    }

    return response;
  } catch {
    return NextResponse.json({ message: "Server error. Please try again." }, { status: 500 });
  }
}
