import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  "https://directus-production-21fe.up.railway.app";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("directus_token")?.value;

  if (!token) redirect("/portal/login");

  // Fetch current user profile
  const meRes = await fetch(
    `${DIRECTUS_URL}/users/me?fields[]=id,first_name,last_name,email,avatar`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );

  if (!meRes.ok) redirect("/portal/login");

  const { data: user } = await meRes.json();

  // Determine which dashboard to link back to
  const role = cookieStore.get("portal_role")?.value || "";
  const backHref =
    role === "teacher" ? "/portal/teacher" :
    role === "student" ? "/portal/student" :
    "/portal";

  return (
    <main style={{ backgroundColor: "#0d0d1a", minHeight: "100vh", color: "#f0eeff" }}>
      {/* Nav */}
      <nav style={{
        padding: "16px 40px",
        borderBottom: "1px solid rgba(123,97,255,0.1)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        backgroundColor: "rgba(13,13,26,0.9)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <a href="/" style={{ fontSize: "17px", fontWeight: 700, color: "#f0eeff", textDecoration: "none" }}>
          Blacksky<span style={{ color: "#7b61ff" }}> Up</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <a href={backHref} style={{ fontSize: "14px", color: "#a0a0c0", textDecoration: "none" }}>
            Dashboard
          </a>
          <form action="/api/portal/logout" method="POST">
            <button type="submit" style={{
              backgroundColor: "transparent",
              border: "1px solid rgba(123,97,255,0.3)",
              borderRadius: "6px", color: "#a0a0c0",
              cursor: "pointer", fontFamily: "inherit",
              fontSize: "13px", padding: "6px 14px",
            }}>
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "56px 40px" }}>
        {/* Header */}
        <div style={{ marginBottom: "48px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#7b61ff", fontWeight: 700, marginBottom: "8px" }}>
            Account
          </div>
          <h1 style={{ fontSize: "36px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
            Your Profile
          </h1>
          <p style={{ color: "#606080", fontSize: "14px", margin: 0 }}>
            {user.email}
          </p>
        </div>

        <ProfileForm
          user={{
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar: user.avatar,
          }}
          backHref={backHref}
        />
      </div>
    </main>
  );
}
