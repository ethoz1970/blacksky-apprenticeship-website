import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PortalNav from "../PortalNav";
import ConversationList from "./ConversationList";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  "https://directus-production-21fe.up.railway.app";

export default async function MessagesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("directus_token")?.value;
  if (!token) redirect("/portal/login");

  const role = cookieStore.get("portal_role")?.value || "";
  if (!role || role === "applicant") redirect("/portal/login");

  const meRes = await fetch(
    `${DIRECTUS_URL}/users/me?fields[]=id,first_name,last_name,avatar`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!meRes.ok) redirect("/portal/login");
  const { data: user } = await meRes.json();

  const isTeacher = role === "teacher";
  const tabs = isTeacher
    ? [
        { label: "Dashboard",  href: "/portal/teacher" },
        { label: "Classes",    href: "/portal/classes" },
        { label: "Library",    href: "/portal/library" },
        { label: "Community",  href: "/portal/community" },
        { label: "People",     href: "/portal/people" },
      ]
    : [
        { label: "Dashboard",  href: "/portal/student" },
        { label: "Classes",    href: "/portal/classes" },
        { label: "Library",    href: "/portal/library" },
        { label: "Community",  href: "/portal/community" },
        { label: "People",     href: "/portal/people" },
      ];

  return (
    <main style={{ backgroundColor: "#0d0d1a", minHeight: "100vh", color: "#f0eeff" }}>
      <PortalNav
        tabs={tabs}
        userId={user.id}
        firstName={user.first_name}
        avatarId={user.avatar}
        role={role}
      />

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "white", margin: "0 0 24px", letterSpacing: "-0.02em" }}>
          Messages
        </h1>

        <div style={{
          backgroundColor: "rgba(26,26,46,0.7)",
          border: "1px solid rgba(123,97,255,0.12)",
          borderRadius: "12px", overflow: "hidden",
        }}>
          <ConversationList myId={user.id} />
        </div>
      </div>
    </main>
  );
}
