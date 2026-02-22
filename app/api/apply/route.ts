import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const DIRECTUS_TOKEN = process.env.DIRECTUS_API_TOKEN!;

const resend = new Resend(process.env.RESEND_API_KEY);

const disciplineLabels: Record<string, string> = {
  media: "Media",
  tech: "Technology",
  business: "Business",
  arts: "Arts",
};

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://blacksky-apprenticeship-website.vercel.app";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, discipline, why_join, background, portfolio_url } = body;

    // Basic validation
    if (!name || !email || !discipline || !why_join || !background) {
      return NextResponse.json({ message: "Please fill in all required fields." }, { status: 400 });
    }

    // Generate a unique confirmation token
    const confirmationToken = generateToken();

    // Save to Directus with awaiting_confirmation status
    const directusRes = await fetch(`${DIRECTUS_URL}/items/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      },
      body: JSON.stringify({
        name,
        email,
        discipline,
        why_join,
        background,
        portfolio_url: portfolio_url || null,
        status: "awaiting_confirmation",
        confirmation_token: confirmationToken,
      }),
    });

    if (!directusRes.ok) {
      const err = await directusRes.json();
      console.error("Directus error:", err);
      return NextResponse.json({ message: "Failed to save application. Please try again." }, { status: 500 });
    }

    const confirmUrl = `${SITE_URL}/confirm-application?token=${confirmationToken}`;
    const firstName = name.split(" ")[0];
    const disciplineLabel = disciplineLabels[discipline] || discipline;

    // Send confirmation email — user must click link to officially submit
    await resend.emails.send({
      from: "Blacksky Up <info@blackskymedia.org>",
      to: email,
      subject: "Confirm your application — Blacksky Up",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
          <div style="background: #1a1a2e; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 800;">
              Blacksky <span style="color: #7b61ff;">Up</span>
            </h1>
          </div>
          <div style="background: #f9f9ff; padding: 40px 32px; border-radius: 0 0 12px 12px;">
            <h2 style="font-size: 22px; color: #1a1a2e; margin: 0 0 16px;">
              One step left, ${firstName}.
            </h2>
            <p style="color: #555; line-height: 1.7; margin: 0 0 16px;">
              You've started an application to Blacksky Up for the <strong>${disciplineLabel}</strong> track. To officially submit it, confirm your email address by clicking the button below.
            </p>
            <p style="color: #888; font-size: 14px; line-height: 1.6; margin: 0 0 28px;">
              If you didn't start this application, you can safely ignore this email.
            </p>
            <a href="${confirmUrl}"
              style="display: inline-block; background: #7b61ff; color: white; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 8px; margin-bottom: 28px;">
              Confirm &amp; Submit Application →
            </a>
            <div style="background: #1a1a2e; border-radius: 8px; padding: 20px 24px; margin: 0 0 24px;">
              <p style="color: #a0a0c0; font-size: 14px; margin: 0 0 8px;">Your application summary</p>
              <p style="color: white; font-size: 15px; margin: 0;"><strong>Name:</strong> ${name}</p>
              <p style="color: white; font-size: 15px; margin: 4px 0 0;"><strong>Discipline:</strong> ${disciplineLabel}</p>
              ${portfolio_url ? `<p style="color: white; font-size: 15px; margin: 4px 0 0;"><strong>Portfolio:</strong> <a href="${portfolio_url}" style="color: #7b61ff;">${portfolio_url}</a></p>` : ""}
            </div>
            <p style="color: #aaa; font-size: 12px; margin: 0; line-height: 1.6;">
              This confirmation link is valid for 7 days.<br/>
              — The Blacksky Team
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Apply route error:", err);
    return NextResponse.json({ message: "Server error. Please try again." }, { status: 500 });
  }
}
