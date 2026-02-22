import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const DIRECTUS_TOKEN = process.env.DIRECTUS_API_TOKEN!;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!;
const STUDENT_ROLE_ID = process.env.DIRECTUS_STUDENT_ROLE_ID!;

const resend = new Resend(process.env.RESEND_API_KEY);

const disciplineLabels: Record<string, string> = {
  media: "Media",
  tech: "Technology",
  business: "Business",
  arts: "Arts",
};

function generateTempPassword(length = 14): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret
    const secret = req.headers.get("x-webhook-secret");
    if (!secret || secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Directus Flow sends the full item in the payload
    // We expect: { keys: [id], payload: { status } } or { key: id, payload: { status } }
    // depending on Flow configuration. We handle both shapes.
    const applicationId: string =
      body.keys?.[0] ?? body.key ?? body.payload?.id ?? body.id;
    const newStatus: string =
      body.payload?.status ?? body.status;

    if (!applicationId || !newStatus) {
      return NextResponse.json(
        { message: "Missing applicationId or status in payload" },
        { status: 400 }
      );
    }

    if (newStatus !== "approved" && newStatus !== "rejected") {
      // Ignore other status changes (e.g. pending → pending)
      return NextResponse.json({ message: "Status not actionable, skipped." });
    }

    // Fetch the full application record
    const appRes = await fetch(
      `${DIRECTUS_URL}/items/applications/${applicationId}`,
      {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
      }
    );

    if (!appRes.ok) {
      console.error("Failed to fetch application:", await appRes.text());
      return NextResponse.json(
        { message: "Could not fetch application" },
        { status: 500 }
      );
    }

    const { data: application } = await appRes.json();
    const { name, email, discipline, selected_class, applicant_user_id } = application;
    const firstName = name.split(" ")[0];
    const disciplineLabel = disciplineLabels[discipline] || discipline;

    if (newStatus === "approved") {
      const tempPassword = generateTempPassword();
      const nameParts = name.trim().split(/\s+/);
      const firstName_ = nameParts[0];
      const lastName_ = nameParts.slice(1).join(" ") || "";

      // --- Upgrade applicant account to Student, or create fresh Student account ---
      // Applicants already have a Directus account (created at email confirmation).
      // On approval we promote that account to the Student role and assign their class.
      let studentUserId: string | null = applicant_user_id ?? null;

      if (studentUserId) {
        // Promote existing Applicant account → Student
        await fetch(`${DIRECTUS_URL}/users/${studentUserId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DIRECTUS_TOKEN}`,
          },
          body: JSON.stringify({
            role: STUDENT_ROLE_ID,
            ...(selected_class ? { class_id: selected_class } : {}),
          }),
        });
      } else {
        // No applicant account found — create a new Student account
        const createUserRes = await fetch(`${DIRECTUS_URL}/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DIRECTUS_TOKEN}`,
          },
          body: JSON.stringify({
            first_name: firstName_,
            last_name: lastName_,
            email,
            password: tempPassword,
            role: STUDENT_ROLE_ID,
            status: "active",
            ...(selected_class ? { class_id: selected_class } : {}),
          }),
        });

        if (createUserRes.ok) {
          const { data: newUser } = await createUserRes.json();
          studentUserId = newUser?.id ?? null;
        } else {
          const err = await createUserRes.json();
          const isDuplicate = err?.errors?.[0]?.extensions?.code === "RECORD_NOT_UNIQUE";
          if (!isDuplicate) {
            console.error("Failed to create Directus user:", err);
            return NextResponse.json(
              { message: "Failed to create student account" },
              { status: 500 }
            );
          }
          // Duplicate — look up existing user by email and promote them
          const lookupRes = await fetch(
            `${DIRECTUS_URL}/users?filter[email][_eq]=${encodeURIComponent(email)}&limit=1`,
            { headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` } }
          );
          if (lookupRes.ok) {
            const { data: found } = await lookupRes.json();
            if (found?.[0]?.id) {
              studentUserId = found[0].id;
              await fetch(`${DIRECTUS_URL}/users/${studentUserId}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${DIRECTUS_TOKEN}`,
                },
                body: JSON.stringify({
                  role: STUDENT_ROLE_ID,
                  ...(selected_class ? { class_id: selected_class } : {}),
                }),
              });
            }
          }
        }
      }

      // --- Send approval email with login details ---
      await resend.emails.send({
        from: "Blacksky Up <info@blackskymedia.org>",
        to: email,
        subject: `You're in, ${firstName} — Welcome to Blacksky Up`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
            <div style="background: #1a1a2e; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 800;">
                Blacksky <span style="color: #7b61ff;">Up</span>
              </h1>
            </div>
            <div style="background: #f9f9ff; padding: 40px 32px; border-radius: 0 0 12px 12px;">
              <h2 style="font-size: 26px; color: #1a1a2e; margin: 0 0 8px; font-weight: 800;">
                Welcome to the program, ${firstName}.
              </h2>
              <p style="font-size: 15px; color: #7b61ff; font-weight: 700; margin: 0 0 24px;">
                ${disciplineLabel} Track — Approved
              </p>
              <p style="color: #555; line-height: 1.7; margin: 0 0 24px;">
                Your application has been reviewed and you've been accepted into the Blacksky Up Apprenticeship Program. This is free, real, and yours. Let's get to work.
              </p>

              <div style="background: #1a1a2e; border-radius: 10px; padding: 24px; margin: 0 0 28px;">
                <p style="color: #a0a0c0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 16px; font-weight: 600;">
                  Your Login Details
                </p>
                <p style="color: white; font-size: 15px; margin: 0 0 8px;">
                  <strong style="color: #a0a0c0;">Portal:</strong>&nbsp;
                  <a href="${DIRECTUS_URL}/admin" style="color: #7b61ff;">${DIRECTUS_URL}/admin</a>
                </p>
                <p style="color: white; font-size: 15px; margin: 0 0 8px;">
                  <strong style="color: #a0a0c0;">Email:</strong>&nbsp; ${email}
                </p>
                <p style="color: white; font-size: 15px; margin: 0;">
                  <strong style="color: #a0a0c0;">Temp Password:</strong>&nbsp;
                  <span style="font-family: monospace; background: rgba(123,97,255,0.15); padding: 3px 8px; border-radius: 4px; font-size: 15px;">${tempPassword}</span>
                </p>
                <p style="color: #606080; font-size: 12px; margin: 12px 0 0;">
                  Please change your password after your first login.
                </p>
              </div>

              <a href="${DIRECTUS_URL}/admin"
                style="display: inline-block; background: #7b61ff; color: white; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 8px;">
                Log In to Your Portal →
              </a>

              <p style="color: #aaa; font-size: 13px; margin: 28px 0 0; line-height: 1.6;">
                Free education. Real knowledge. No exceptions.<br/>
                — The Blacksky Team
              </p>
            </div>
          </div>
        `,
      });

      // Mark application as reviewed in Directus
      await fetch(`${DIRECTUS_URL}/items/applications/${applicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DIRECTUS_TOKEN}`,
        },
        body: JSON.stringify({ reviewed_at: new Date().toISOString() }),
      });

      console.log(`Approved and created account for ${email}`);
      return NextResponse.json({ success: true, action: "approved", email });
    }

    if (newStatus === "rejected") {
      // --- Send rejection email ---
      await resend.emails.send({
        from: "Blacksky Up <info@blackskymedia.org>",
        to: email,
        subject: "Your Blacksky Up Application",
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
            <div style="background: #1a1a2e; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 800;">
                Blacksky <span style="color: #7b61ff;">Up</span>
              </h1>
            </div>
            <div style="background: #f9f9ff; padding: 40px 32px; border-radius: 0 0 12px 12px;">
              <h2 style="font-size: 22px; color: #1a1a2e; margin: 0 0 20px; font-weight: 800;">
                Thank you for applying, ${firstName}.
              </h2>
              <p style="color: #555; line-height: 1.7; margin: 0 0 16px;">
                We genuinely appreciate you taking the time to apply to Blacksky Up. After carefully reviewing your application for the <strong>${disciplineLabel}</strong> track, we aren't moving forward at this time.
              </p>
              <p style="color: #555; line-height: 1.7; margin: 0 0 24px;">
                This isn't a reflection of your potential — cohort sizes are limited and we weigh a lot of factors. We encourage you to apply again in a future cohort.
              </p>
              <p style="color: #555; line-height: 1.7; margin: 0 0 32px;">
                Keep building. Keep showing up.
              </p>
              <a href="https://blackskyapprentice.com"
                style="display: inline-block; background: #1a1a2e; color: white; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 8px;">
                Visit the Program
              </a>
              <p style="color: #aaa; font-size: 13px; margin: 28px 0 0;">
                — The Blacksky Team
              </p>
            </div>
          </div>
        `,
      });

      // Mark application as reviewed
      await fetch(`${DIRECTUS_URL}/items/applications/${applicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DIRECTUS_TOKEN}`,
        },
        body: JSON.stringify({ reviewed_at: new Date().toISOString() }),
      });

      console.log(`Rejection email sent to ${email}`);
      return NextResponse.json({ success: true, action: "rejected", email });
    }

    return NextResponse.json({ message: "Unhandled state" });
  } catch (err) {
    console.error("review-application error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
