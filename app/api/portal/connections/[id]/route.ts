import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const ADMIN_TOKEN  = process.env.DIRECTUS_API_TOKEN!;
const SITE_URL     = process.env.NEXT_PUBLIC_SITE_URL || "https://blackskyup.com";
const resend       = new Resend(process.env.RESEND_API_KEY);

function emailHtml(body: string) {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#333;">
      <div style="background:#1a1a2e;padding:32px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="color:white;font-size:24px;margin:0;font-weight:800;">
          Blacksky <span style="color:#7b61ff;">Up</span>
        </h1>
      </div>
      <div style="background:#f9f9ff;padding:40px 32px;border-radius:0 0 12px 12px;">
        ${body}
        <p style="color:#aaa;font-size:12px;margin:28px 0 0;line-height:1.6;">
          — The Blacksky Team
        </p>
      </div>
    </div>
  `;
}

function ctaButton(href: string, text: string) {
  return `<a href="${href}" style="display:inline-block;background:#7b61ff;color:white;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;margin:20px 0;">${text} →</a>`;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action } = await req.json(); // "accept" | "decline"

  const status = action === "accept" ? "accepted" : "declined";

  // Update connection status
  const res = await fetch(`${DIRECTUS_URL}/items/user_connections/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to update connection" }, { status: res.status });
  const json = await res.json();

  // ── Fire-and-forget: email the original requester ──
  (async () => {
    try {
      // Fetch the full connection with requester details
      const connRes = await fetch(
        `${DIRECTUS_URL}/items/user_connections/${id}` +
        `?fields[]=id,requester.id,requester.email,requester.first_name,recipient.id,recipient.first_name,recipient.last_name`,
        { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
      );
      if (!connRes.ok) return;
      const { data: conn } = await connRes.json();

      const requester = conn?.requester;
      const recipient = conn?.recipient;
      if (!requester?.email) return;

      const recipientName = `${recipient?.first_name ?? ""} ${recipient?.last_name ?? ""}`.trim() || "A member";
      const requesterFirst = requester.first_name ?? "there";

      if (action === "accept") {
        await resend.emails.send({
          from: "Blacksky Up <info@blackskymedia.org>",
          to: requester.email,
          subject: `${recipientName} accepted your connection request`,
          html: emailHtml(`
            <h2 style="font-size:22px;color:#1a1a2e;margin:0 0 16px;">You're connected! 🎉</h2>
            <p style="color:#555;line-height:1.7;margin:0 0 8px;">
              Hi ${requesterFirst},
            </p>
            <p style="color:#555;line-height:1.7;margin:0 0 20px;">
              <strong>${recipientName}</strong> accepted your connection request.
              You can now message each other directly on Blacksky Up.
            </p>
            ${ctaButton(`${SITE_URL}/portal/messages`, "Open Messages")}
          `),
        });
      } else {
        await resend.emails.send({
          from: "Blacksky Up <info@blackskymedia.org>",
          to: requester.email,
          subject: `Update on your connection request`,
          html: emailHtml(`
            <h2 style="font-size:22px;color:#1a1a2e;margin:0 0 16px;">Connection request update</h2>
            <p style="color:#555;line-height:1.7;margin:0 0 8px;">
              Hi ${requesterFirst},
            </p>
            <p style="color:#555;line-height:1.7;margin:0 0 20px;">
              <strong>${recipientName}</strong> wasn't able to connect at this time.
              You can still discover and connect with other members of the community.
            </p>
            ${ctaButton(`${SITE_URL}/portal/people`, "Browse People")}
          `),
        });
      }
    } catch (e) {
      console.error("[connections PATCH] email error:", e);
    }
  })();

  return NextResponse.json({ data: json.data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const res = await fetch(`${DIRECTUS_URL}/items/user_connections/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204 || res.ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ error: "Failed to delete connection" }, { status: res.status });
}
