import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const DIRECTUS_TOKEN = process.env.DIRECTUS_API_TOKEN!;
const SECRET = process.env.WEBHOOK_SECRET!;

/**
 * Verifies an HMAC-signed reset token created by /api/portal/forgot-password.
 * Returns the userId if valid, or null if invalid/expired.
 */
function verifyResetToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payload, sig] = parts;

  // Verify signature
  const expectedSig = createHmac("sha256", SECRET)
    .update(payload)
    .digest("base64url");

  const sigBuffer = Buffer.from(sig, "base64url");
  const expectedBuffer = Buffer.from(expectedSig, "base64url");

  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  // Decode payload and check expiry
  try {
    const { uid, exp } = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8")
    );
    if (!uid || !exp || Date.now() > exp) return null;
    return uid as string;
  } catch {
    return null;
  }
}

/**
 * POST /api/portal/reset-password
 *
 * Verifies the HMAC-signed token and updates the user's password
 * via the Directus admin API.
 *
 * Body: { token, password }
 */
export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { message: "Token and new password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const userId = verifyResetToken(token);
    if (!userId) {
      return NextResponse.json(
        {
          message:
            "This reset link is invalid or has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    // Update the user's password via admin API
    const patchRes = await fetch(`${DIRECTUS_URL}/users/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      },
      body: JSON.stringify({ password }),
    });

    if (!patchRes.ok) {
      console.error(
        "Failed to reset password for user",
        userId,
        await patchRes.text()
      );
      return NextResponse.json(
        { message: "Failed to reset password. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("reset-password error:", err);
    return NextResponse.json({ message: "Server error." }, { status: 500 });
  }
}
