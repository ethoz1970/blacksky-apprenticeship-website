import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { Resend } from "resend";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const DIRECTUS_TOKEN = process.env.DIRECTUS_API_TOKEN!;
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://blacksky-apprenticeship-website.vercel.app";
const SECRET = process.env.WEBHOOK_SECRET!; // reuse existing secret for HMAC signing

const resend = new Resend(process.env.RESEND_API_KEY);

const TOKEN_EXPIRY_HOURS = 1;

/**
 * Creates an HMAC-signed password reset token.
 * Format: base64url({ userId, exp }) + "." + signature
 * No database writes required — the token is self-contained.
 */
function createResetToken(userId: string): string {
  const exp = Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp })).toString(
    "base64url"
  );
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/**
 * POST /api/portal/forgot-password
 *
 * Looks up the user in Directus by email, generates a signed reset token,
 * and sends the reset link via Resend.
 *
 * Always returns success to prevent email-enumeration attacks.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json(
        { message: "Email is required." },
        { status: 400 }
      );
    }

    // Look up user by email (admin token — never exposed to client)
    const lookupRes = await fetch(
      `${DIRECTUS_URL}/users?filter[email][_eq]=${encodeURIComponent(
        email
      )}&fields[]=id,first_name,email&limit=1`,
      { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` } }
    );

    if (lookupRes.ok) {
      const { data: users } = await lookupRes.json();
      const user = users?.[0];

      if (user) {
        const token = createResetToken(user.id);
        const resetUrl = `${SITE_URL}/portal/reset-password?token=${token}`;
        const firstName = user.first_name || "there";

        await resend.emails.send({
          from: "Blacksky Up <info@blackskymedia.org>",
          to: email,
          subject: "Reset your password — Blacksky Up",
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
              <div style="background: #1a1a2e; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 800;">
                  Blacksky <span style="color: #7b61ff;">Up</span>
                </h1>
              </div>
              <div style="background: #f9f9ff; padding: 40px 32px; border-radius: 0 0 12px 12px;">
                <h2 style="font-size: 22px; color: #1a1a2e; margin: 0 0 16px;">
                  Password reset, ${firstName}.
                </h2>
                <p style="color: #555; line-height: 1.7; margin: 0 0 16px;">
                  We received a request to reset the password for your Blacksky Up account. Click the button below to choose a new password.
                </p>
                <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 0 0 28px;">
                  This link expires in ${TOKEN_EXPIRY_HOURS} hour${TOKEN_EXPIRY_HOURS > 1 ? "s" : ""}. If you didn't request this, you can safely ignore this email.
                </p>
                <a href="${resetUrl}"
                  style="display: inline-block; background: #7b61ff; color: white; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 8px; margin-bottom: 28px;">
                  Reset Password →
                </a>
                <p style="color: #aaa; font-size: 12px; margin: 0; line-height: 1.6;">
                  If the button doesn't work, copy and paste this URL into your browser:<br/>
                  <span style="color: #7b61ff; word-break: break-all;">${resetUrl}</span>
                </p>
                <p style="color: #aaa; font-size: 12px; margin: 20px 0 0; line-height: 1.6;">
                  — The Blacksky Team
                </p>
              </div>
            </div>
          `,
        });
      }
    }

    // Always return success — never reveal whether the email exists
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("forgot-password error:", err);
    return NextResponse.json({ message: "Server error." }, { status: 500 });
  }
}
