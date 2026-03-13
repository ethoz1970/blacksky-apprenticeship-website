import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PortalNav from "../PortalNav";
import PeopleDirectory from "./PeopleDirectory";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  "https://directus-production-21fe.up.railway.app";

export default async function PeoplePage() {
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

  // Fetch unread message count
  let unreadCount = 0;
  try {
    const msgsRes = await fetch(`${DIRECTUS_URL}/items/direct_messages` +
      `?filter[sender][_neq]=${user.id}&filter[read_at][_null]=true` +
      `&aggregate[count]=id`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (msgsRes.ok) {
      const msgsJson = await msgsRes.json();
      unreadCount = Number(msgsJson.data?.[0]?.count?.id ?? 0);
    }
  } catch { /* ignore */ }

  const isTeacher = role === "teacher";
  const tabs = isTeacher
    ? [
        { label: "Dashboard",     href: "/portal/teacher" },
        { label: "Community",     href: "/portal/community" },
        { label: "People",        href: "/portal/people" },
      ]
    : [
        { label: "Dashboard",     href: "/portal/student" },
        { label: "Community",     href: "/portal/community" },
        { label: "People",        href: "/portal/people" },
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

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "white", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            People
          </h1>
          <p style={{ fontSize: "14px", color: "#707090", margin: 0 }}>
            Discover and connect with students and teachers in the program.
          </p>
        </div>

        <PeopleDirectory myId={user.id} />
      </div>
    </main>
  );
}
