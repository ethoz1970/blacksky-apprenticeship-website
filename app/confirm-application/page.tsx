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

async function confirmApplication(
  token: string
): Promise<{ success: boolean; name?: string; error?: string }> {
  try {
    // Look up application by confirmation_token
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
      return { success: false, error: "server_error" };
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
              ? "Your application has already been confirmed — you're all set. We'll be in touch soon."
              : "We couldn't process your confirmation. Please try again or reach out to us for help."}
          </p>
          <a href="/" style={{ backgroundColor: "#7b61ff", color: "white", textDecoration: "none", fontWeight: 700, fontSize: "15px", padding: "14px 32px", borderRadius: "8px", display: "inline-block" }}>
            Back to Home
          </a>
        </div>
      </main>
    );
  }

  // Success — application officially submitted
  return (
    <main style={mainStyle}>
      <div style={{ textAlign: "center", maxWidth: "520px" }}>
        <div style={{ fontSize: "48px", marginBottom: "24px" }}>✦</div>
        <h1 style={{ fontSize: "36px", fontWeight: 800, color: "white", marginBottom: "16px", letterSpacing: "-0.02em" }}>
          {result.name ? `You're in, ${result.name}.` : "Application submitted."}
        </h1>
        <p style={{ fontSize: "18px", color: "#a0a0c0", lineHeight: 1.75, marginBottom: "12px" }}>
          Your application has been officially submitted. We review every application personally and will be in touch within a few days.
        </p>
        <p style={{ fontSize: "14px", color: "#606080", marginBottom: "40px" }}>
          Free education. Real knowledge. No exceptions.
        </p>
        <a href="/" style={{ backgroundColor: "#7b61ff", color: "white", textDecoration: "none", fontWeight: 700, fontSize: "15px", padding: "14px 32px", borderRadius: "8px", display: "inline-block" }}>
          Back to Home
        </a>
      </div>
    </main>
  );
}
