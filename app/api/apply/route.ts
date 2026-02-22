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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, discipline, why_join, background, portfolio_url } = body;

    // Basic validation
    if (!name || !email || !discipline || !why_join || !background) {
      return NextResponse.json({ message: "Please fill in all required fields." }, { status: 400 });
    }

    // Save to Directus
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
        status: "pending",
      }),
    });

    if (!directusRes.ok) {
      const err = await directusRes.json();
      console.error("Directus error:", err);
      return NextResponse.json({ message: "Failed to save application. Please try again." }, { status: 500 });
    }

    // Send confirmation email to applicant
    await resend.emails.send({
      from: "Blacksky Apprenticeship <noreply@blackskyapprentice.com>",
      to: email,
      subject: "We received your application — Blacksky Apprenticeship Program",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
          <div style="background: #1a1a2e; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 800;">
              Blacksky <span style="color: #7b61ff;">Apprenticeship</span>
            </h1>
          </div>
          <div style="background: #f9f9ff; padding: 40px 32px; border-radius: 0 0 12px 12px;">
            <h2 style="font-size: 22px; color: #1a1a2e; margin: 0 0 16px;">
              Application received, ${name.split(" ")[0]}.
            </h2>
            <p style="color: #555; line-height: 1.7; margin: 0 0 16px;">
              Thank you for applying to the Blacksky Apprenticeship Program. We've received your application for the <strong>${disciplineLabels[discipline] || discipline}</strong> track and will review it personally.
            </p>
            <p style="color: #555; line-height: 1.7; margin: 0 0 24px;">
              Expect to hear back from us within a few days. In the meantime, feel free to explore our upcoming courses.
            </p>
            <div style="background: #1a1a2e; border-radius: 8px; padding: 20px 24px; margin: 0 0 24px;">
              <p style="color: #a0a0c0; font-size: 14px; margin: 0 0 4px;">Your application summary</p>
              <p style="color: white; font-size: 15px; margin: 0;"><strong>Name:</strong> ${name}</p>
              <p style="color: white; font-size: 15px; margin: 4px 0 0;"><strong>Discipline:</strong> ${disciplineLabels[discipline] || discipline}</p>
              ${portfolio_url ? `<p style="color: white; font-size: 15px; margin: 4px 0 0;"><strong>Portfolio:</strong> <a href="${portfolio_url}" style="color: #7b61ff;">${portfolio_url}</a></p>` : ""}
            </div>
            <a href="${DIRECTUS_URL?.replace("directus-production-21fe.up.railway.app", "blackskyapprentice.com") || "https://blackskyapprentice.com"}"
              style="display: inline-block; background: #7b61ff; color: white; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 8px;">
              Visit the Program
            </a>
            <p style="color: #aaa; font-size: 13px; margin: 24px 0 0;">
              Free education. Real knowledge. No exceptions.<br/>
              — The Blacksky Team
            </p>
          </div>
        </div>
      `,
    });

    // Notify admin
    await resend.emails.send({
      from: "Blacksky Apprenticeship <noreply@blackskyapprentice.com>",
      to: "blackskymedia@gmail.com",
      subject: `New application — ${name} (${disciplineLabels[discipline] || discipline})`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">New Application Received</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; color: #666; width: 140px;">Name</td><td style="padding: 8px; font-weight: 600;">${name}</td></tr>
            <tr style="background:#f5f5f5"><td style="padding: 8px; color: #666;">Email</td><td style="padding: 8px;">${email}</td></tr>
            <tr><td style="padding: 8px; color: #666;">Discipline</td><td style="padding: 8px;">${disciplineLabels[discipline] || discipline}</td></tr>
            <tr style="background:#f5f5f5"><td style="padding: 8px; color: #666;">Portfolio</td><td style="padding: 8px;">${portfolio_url || "—"}</td></tr>
          </table>
          <h3 style="color: #1a1a2e; margin-top: 24px;">Why they want to join</h3>
          <p style="background: #f5f5f5; padding: 16px; border-radius: 8px; line-height: 1.7;">${why_join}</p>
          <h3 style="color: #1a1a2e;">Background</h3>
          <p style="background: #f5f5f5; padding: 16px; border-radius: 8px; line-height: 1.7;">${background}</p>
          <a href="${DIRECTUS_URL}/admin/content/applications" style="display: inline-block; background: #7b61ff; color: white; text-decoration: none; font-weight: 700; padding: 12px 24px; border-radius: 8px; margin-top: 16px;">
            View in Directus
          </a>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Apply route error:", err);
    return NextResponse.json({ message: "Server error. Please try again." }, { status: 500 });
  }
}
