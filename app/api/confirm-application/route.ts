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

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  // Look up application by confirmation_token
  const searchRes = await fetch(
    `${DIRECTUS_URL}/items/applications?filter[confirmation_token][_eq]=${encodeURIComponent(token)}&filter[status][_eq]=awaiting_confirmation&limit=1`,
    { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` } }
  );

  if (!searchRes.ok) {
    console.error("Directus search error:", await searchRes.text());
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const { data } = await searchRes.json();

  if (!data || data.length === 0) {
    // Token not found or already confirmed
    return NextResponse.json({ error: "invalid_or_used" }, { status: 404 });
  }

  const application = data[0];
  const { id, name, email, discipline, why_join, background, portfolio_url } = application;
  const firstName = name.split(" ")[0];
  const disciplineLabel = disciplineLabels[discipline] || discipline;

  // Update application: status → pending, clear token
  const updateRes = await fetch(`${DIRECTUS_URL}/items/applications/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DIRECTUS_TOKEN}`,
    },
    body: JSON.stringify({
      status: "pending",
      confirmation_token: null,
    }),
  });

  if (!updateRes.ok) {
    console.error("Failed to update application:", await updateRes.text());
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Send admin notification now that the application is confirmed
  await resend.emails.send({
    from: "Blacksky Up <info@blackskymedia.org>",
    to: "blackskymedia@gmail.com",
    subject: `New application — ${name} (${disciplineLabel})`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">New Application Received</h2>
        <p style="color: #555;">The applicant confirmed their email address.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; color: #666; width: 140px;">Name</td><td style="padding: 8px; font-weight: 600;">${name}</td></tr>
          <tr style="background:#f5f5f5"><td style="padding: 8px; color: #666;">Email</td><td style="padding: 8px;">${email}</td></tr>
          <tr><td style="padding: 8px; color: #666;">Discipline</td><td style="padding: 8px;">${disciplineLabel}</td></tr>
          <tr style="background:#f5f5f5"><td style="padding: 8px; color: #666;">Portfolio</td><td style="padding: 8px;">${portfolio_url || "—"}</td></tr>
        </table>
        <h3 style="color: #1a1a2e; margin-top: 24px;">Why they want to join</h3>
        <p style="background: #f5f5f5; padding: 16px; border-radius: 8px; line-height: 1.7;">${why_join}</p>
        <h3 style="color: #1a1a2e;">Background</h3>
        <p style="background: #f5f5f5; padding: 16px; border-radius: 8px; line-height: 1.7;">${background}</p>
        <a href="${DIRECTUS_URL}/admin/content/applications" style="display: inline-block; background: #7b61ff; color: white; text-decoration: none; font-weight: 700; padding: 12px 24px; border-radius: 8px; margin-top: 16px;">
          Review in Directus
        </a>
      </div>
    `,
  });

  return NextResponse.json({ success: true, name: firstName });
}
