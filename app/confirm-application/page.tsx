import { Resend } from "resend";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const DIRECTUS_TOKEN = process.env.DIRECTUS_API_TOKEN!;
const APPLICANT_ROLE_ID = process.env.DIRECTUS_APPLICANT_ROLE_ID!;

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

async function confirmApplication(
  token: string
): Promise<{ success: boolean; name?: string; error?: string }> {
  try {
    // 1. Look up application by confirmation_token
    const searchRes = await fetch(
      `${DIRECTUS_URL}/items/applications?filter[confirmation_token][_eq]=${encodeURIComponent(token)}&filter[status][_eq]=awaiting_confirmation&limit=1`,
      {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
        cache: "no-store",
      }
    );

    if (!searchRes.ok) {
      console.error("Directus search error:", await searchRes.text());
      return { success: false, error: "server_error" };
    }

    const { data } = await searchRes.json();

    if (!data || data.length === 0) {
      return { success: false, error: "invalid_or_used" };
    }

    const application = data[0];
    const { id, name, email, discipline, why_join, background, portfolio_url } = application;
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";
    const disciplineLabel = disciplineLabels[discipline] || discipline;
    const tempPassword = generateTempPassword();

    // 2. Create Directus applicant account
    let applicantUserId: string | null = null;
    const createUserRes = await fetch(`${DIRECTUS_URL}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email,
        password: tempPassword,
        role: APPLICANT_ROLE_ID,
        status: "active",
      }),
    });

    if (createUserRes.ok) {
      const { data: newUser } = await createUserRes.json();
      applicantUserId = newUser?.id ?? null;
    } else {
      const err = await createUserRes.json();
      // If email already exists the account is already linked — continue without failing
      const isAlreadyExists =
        err?.errors?.[0]?.extensions?.code === "RECORD_NOT_UNIQUE";
      if (!isAlreadyExists) {
        console.error("Failed to create applicant user:", err);
        // Non-fatal — still confirm the application but without an account
      }
    }

    // 3. Confirm application: status → pending, clear token, link user
    const updateRes = await fetch(`${DIRECTUS_URL}/items/applications/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DIRECTUS_TOKEN}`,
      },
      body: JSON.stringify({
        status: "pending",
        confirmation_token: null,
        ...(applicantUserId ? { applicant_user_id: applicantUserId } : {}),
      }),
    });

    if (!updateRes.ok) {
      console.error("Failed to update application:", await updateRes.text());
      return { success: false, error: "server_error" };
    }

    const loginUrl = `${DIRECTUS_URL}/admin`;

    // 4. Send both emails in parallel
    await Promise.all([
      // Applicant: submission confirmed + login credentials
      resend.emails.send({
        from: "Blacksky Up <info@blackskymedia.org>",
        to: email,
        subject: "Your application has been submitted — Blacksky Up",
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
            <div style="background: #1a1a2e; padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; font-size: 24px; margin: 0; font-weight: 800;">
                Blacksky <span style="color: #7b61ff;">Up</span>
              </h1>
            </div>
            <div style="background: #f9f9ff; padding: 40px 32px; border-radius: 0 0 12px 12px;">
              <h2 style="font-size: 22px; color: #1a1a2e; margin: 0 0 16px;">
                Application submitted, ${firstName}.
              </h2>
              <p style="color: #555; line-height: 1.7; margin: 0 0 16px;">
                Your application to the <strong>${disciplineLabel}</strong> track is officially in. We review every application personally and will be in touch within a few days.
              </p>
              <p style="color: #555; line-height: 1.7; margin: 0 0 24px;">
                In the meantime, you can log into your applicant portal to update your application, add to your portfolio, or check in on your status.
              </p>

              ${applicantUserId ? `
              <div style="background: #1a1a2e; border-radius: 10px; padding: 24px; margin: 0 0 28px;">
                <p style="color: #a0a0c0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 16px; font-weight: 600;">
                  Your Portal Login
                </p>
                <p style="color: white; font-size: 15px; margin: 0 0 8px;">
                  <strong style="color: #a0a0c0;">URL:</strong>&nbsp;
                  <a href="${loginUrl}" style="color: #7b61ff;">${loginUrl}</a>
                </p>
                <p style="color: white; font-size: 15px; margin: 0 0 8px;">
                  <strong style="color: #a0a0c0;">Email:</strong>&nbsp; ${email}
                </p>
                <p style="color: white; font-size: 15px; margin: 0;">
                  <strong style="color: #a0a0c0;">Temp Password:</strong>&nbsp;
                  <span style="font-family: monospace; background: rgba(123,97,255,0.15); padding: 3px 8px; border-radius: 4px;">${tempPassword}</span>
                </p>
                <p style="color: #606080; font-size: 12px; margin: 12px 0 0;">
                  Please change your password after your first login.
                </p>
              </div>
              <a href="${loginUrl}"
                style="display: inline-block; background: #7b61ff; color: white; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 8px; margin-bottom: 28px;">
                Log In to Your Portal →
              </a>
              ` : `
              <div style="background: #1a1a2e; border-radius: 8px; padding: 20px 24px; margin: 0 0 28px;">
                <p style="color: #a0a0c0; font-size: 14px; margin: 0 0 8px;">Your application summary</p>
                <p style="color: white; font-size: 15px; margin: 0;"><strong>Name:</strong> ${name}</p>
                <p style="color: white; font-size: 15px; margin: 4px 0 0;"><strong>Discipline:</strong> ${disciplineLabel}</p>
                ${portfolio_url ? `<p style="color: white; font-size: 15px; margin: 4px 0 0;"><strong>Portfolio:</strong> <a href="${portfolio_url}" style="color: #7b61ff;">${portfolio_url}</a></p>` : ""}
              </div>
              `}

              <p style="color: #aaa; font-size: 13px; margin: 0; line-height: 1.6;">
                Free education. Real knowledge. No exceptions.<br/>
                — The Blacksky Team
              </p>
            </div>
          </div>
        `,
      }),

      // Admin: new application to review
      resend.emails.send({
        from: "Blacksky Up <info@blackskymedia.org>",
        to: "blackskymedia@gmail.com",
        subject: `New application — ${name} (${disciplineLabel})`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
            <h2 style="color: #1a1a2e;">New Application Received</h2>
            <p style="color: #555;">The applicant confirmed their email address. An applicant portal account has been created.</p>
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
      }),
    ]);

    return { success: true, name: firstName };
  } catch (err) {
    console.error("confirmApplication error:", err);
    return { success: false, error: "server_error" };
  }
}

// In Next.js 15+ searchParams is a Promise — must be awaited
export default async function ConfirmApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  const noToken = !token;
  const result = token ? await confirmApplication(token) : null;

  const mainStyle = {
    backgroundColor: "#0d0d1a",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
    fontFamily: "system-ui, sans-serif",
  } as React.CSSProperties;

  // No token in URL
  if (noToken || !result) {
    return (
      <main style={mainStyle}>
        <div style={{ textAlign: "center", maxWidth: "520px" }}>
          <div style={{ fontSize: "48px", marginBottom: "24px" }}>⚠</div>
          <h1 style={{ fontSize: "30px", fontWeight: 800, color: "white", marginBottom: "16px", letterSpacing: "-0.02em" }}>
            Invalid link.
          </h1>
          <p style={{ fontSize: "16px", color: "#a0a0c0", lineHeight: 1.75, marginBottom: "32px" }}>
            This confirmation link is missing or invalid. Please check your email for the correct link.
          </p>
          <a href="/apply" style={{ backgroundColor: "#7b61ff", color: "white", textDecoration: "none", fontWeight: 700, fontSize: "15px", padding: "14px 32px", borderRadius: "8px", display: "inline-block" }}>
            Back to Apply
          </a>
        </div>
      </main>
    );
  }

  // Token found but already used / not found
  if (!result.success) {
    const isUsed = result.error === "invalid_or_used";
    return (
      <main style={mainStyle}>
        <div style={{ textAlign: "center", maxWidth: "520px" }}>
          <div style={{ fontSize: "48px", marginBottom: "24px" }}>⚠</div>
          <h1 style={{ fontSize: "30px", fontWeight: 800, color: "white", marginBottom: "16px", letterSpacing: "-0.02em" }}>
            {isUsed ? "Already confirmed." : "Something went wrong."}
          </h1>
          <p style={{ fontSize: "16px", color: "#a0a0c0", lineHeight: 1.75, marginBottom: "32px" }}>
            {isUsed
              ? "Your application has already been confirmed — you're all set. Check your email for your portal login details."
              : "We couldn't process your confirmation. Please try again or reach out to us for help."}
          </p>
          <a href="/" style={{ backgroundColor: "#7b61ff", color: "white", textDecoration: "none", fontWeight: 700, fontSize: "15px", padding: "14px 32px", borderRadius: "8px", display: "inline-block" }}>
            Back to Home
          </a>
        </div>
      </main>
    );
  }

  // Success — application officially submitted, account created
  return (
    <main style={mainStyle}>
      <div style={{ textAlign: "center", maxWidth: "520px" }}>
        <div style={{ fontSize: "48px", marginBottom: "24px" }}>✦</div>
        <h1 style={{ fontSize: "36px", fontWeight: 800, color: "white", marginBottom: "16px", letterSpacing: "-0.02em" }}>
          {result.name ? `You're in, ${result.name}.` : "Application submitted."}
        </h1>
        <p style={{ fontSize: "18px", color: "#a0a0c0", lineHeight: 1.75, marginBottom: "12px" }}>
          Your application is officially submitted. We sent your portal login details to your email — you can log in to update your application any time.
        </p>
        <p style={{ fontSize: "14px", color: "#606080", marginBottom: "40px" }}>
          Free education. Real knowledge. No exceptions.
        </p>
        <a
          href={`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/admin`}
          style={{ backgroundColor: "#7b61ff", color: "white", textDecoration: "none", fontWeight: 700, fontSize: "15px", padding: "14px 32px", borderRadius: "8px", display: "inline-block" }}
        >
          Log In to Your Portal →
        </a>
      </div>
    </main>
  );
}
