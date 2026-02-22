import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://blacksky-apprenticeship-website.vercel.app";

/**
 * POST /api/portal/forgot-password
 * Triggers Directus's built-in password-reset flow.
 * Directus generates a signed token and emails the user a link to
 * /portal/reset-password?token=TOKEN.
 *
 * Always returns success to prevent email-enumeration attacks.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ message: "Email is required." }, { status: 400 });
    }

    // Fire-and-forget — we never reveal whether the email exists
    await fetch(`${DIRECTUS_URL}/auth/password/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        reset_url: `${SITE_URL}/portal/reset-password`,
      }),
    }).catch(() => {}); // Swallow errors intentionally

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Server error." }, { status: 500 });
  }
}
