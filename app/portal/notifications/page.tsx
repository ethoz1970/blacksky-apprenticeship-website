import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PortalNav from "../PortalNav";
import NotificationsFeed from "./NotificationsFeed";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("directus_token")?.value;
  if (!token) redirect("/portal/login");

  const role = cookieStore.get("portal_role")?.value ?? "";
  if (!role || role === "applicant") redirect("/portal/login");

  const meRes = await fetch(
    `${DIRECTUS_URL}/users/me?fields[]=id,first_name,last_name,avatar`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!meRes.ok) redirect("/portal/login");
  const { data: user } = await meRes.json();

  const tabs = role === "admin"
    ? [
        { label: "Dashboard",  href: "/portal/admin" },
        { label: "Users",      href: "/portal/admin/users" },
        { label: "Classes",    href: "/portal/classes" },
        { label: "Library",    href: "/portal/library" },
        { label: "Community",  href: "/portal/community" },
        { label: "People",     href: "/portal/people" },
      ]
    : role === "teacher"
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
        avatarId={user.avatar ?? null}
        role={role}
      />

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "white", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Notifications
          </h1>
          <p style={{ fontSize: "14px", color: "#707090", margin: 0 }}>
            Connection requests and unread messages.
          </p>
        </div>

        <NotificationsFeed myId={user.id} />
      </div>
    </main>
  );
}
