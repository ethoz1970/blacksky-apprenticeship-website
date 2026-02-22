import { redirect } from "next/navigation";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://blacksky-apprenticeship-website.vercel.app";

async function confirmToken(token: string): Promise<{ success: boolean; name?: string; error?: string }> {
  try {
    const res = await fetch(`${SITE_URL}/api/confirm-application?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "unknown" };
    }
    return { success: true, name: data.name };
  } catch {
    return { success: false, error: "server_error" };
  }
}

export default async function ConfirmApplicationPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  if (!token) {
    redirect("/apply");
  }

  const result = await confirmToken(token);

  if (!result.success) {
    const isUsed = result.error === "invalid_or_used";
    return (
      <main
        style={{
          backgroundColor: "#0d0d1a",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "520px" }}>
          <div style={{ fontSize: "48px", marginBottom: "24px" }}>⚠</div>
          <h1
            style={{
              fontSize: "30px",
              fontWeight: 800,
              color: "white",
              marginBottom: "16px",
              letterSpacing: "-0.02em",
            }}
          >
            {isUsed ? "Link already used." : "Something went wrong."}
          </h1>
          <p style={{ fontSize: "16px", color: "#a0a0c0", lineHeight: 1.75, marginBottom: "32px" }}>
            {isUsed
              ? "This confirmation link has already been used or has expired. If you believe this is an error, please reach out to us."
              : "We couldn't process your confirmation. Please try again or contact us for help."}
          </p>
          <a
            href="/"
            style={{
              backgroundColor: "#7b61ff",
              color: "white",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "15px",
              padding: "14px 32px",
              borderRadius: "8px",
              display: "inline-block",
            }}
          >
            Back to Home
          </a>
        </div>
      </main>
    );
  }

  // Success — application is now officially submitted
  return (
    <main
      style={{
        backgroundColor: "#0d0d1a",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "520px" }}>
        <div style={{ fontSize: "48px", marginBottom: "24px" }}>✦</div>
        <h1
          style={{
            fontSize: "36px",
            fontWeight: 800,
            color: "white",
            marginBottom: "16px",
            letterSpacing: "-0.02em",
          }}
        >
          {result.name ? `You're in, ${result.name}.` : "Application submitted."}
        </h1>
        <p style={{ fontSize: "18px", color: "#a0a0c0", lineHeight: 1.75, marginBottom: "12px" }}>
          Your application has been officially submitted. We review every application personally and will be in touch soon.
        </p>
        <p style={{ fontSize: "14px", color: "#606080", marginBottom: "40px" }}>
          Free education. Real knowledge. No exceptions.
        </p>
        <a
          href="/"
          style={{
            backgroundColor: "#7b61ff",
            color: "white",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "15px",
            padding: "14px 32px",
            borderRadius: "8px",
            display: "inline-block",
          }}
        >
          Back to Home
        </a>
      </div>
    </main>
  );
}
