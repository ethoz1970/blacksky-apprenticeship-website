import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ClassSection from "./ClassSection";
import PortalNav from "../PortalNav";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  "https://directus-production-21fe.up.railway.app";

import type { ClassData } from "./ClassSection";

export default async function TeacherPortalPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("directus_token")?.value;

  if (!token) redirect("/portal/login");

  // Role stored at login — no need to re-fetch from Directus
  const role = cookieStore.get("portal_role")?.value || "";
  if (role === "student") redirect("/portal/student");
  if (role && role !== "teacher") redirect("/portal/login");

  // Get current user info and ID (no role.name needed)
  const meRes = await fetch(
    `${DIRECTUS_URL}/users/me?fields[]=id,first_name,last_name,avatar,last_access`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );

  if (!meRes.ok) redirect("/portal/login");

  const { data: user } = await meRes.json();

  // Fetch teacher's classes (using their actual user ID)
  const classRes = await fetch(
    `${DIRECTUS_URL}/items/classes` +
    `?filter[teacher][_eq]=${user.id}` +
    `&fields[]=id,name,description,discipline` +
    `&fields[]=students.id,students.first_name,students.last_name` +
    `&fields[]=materials.id,materials.title,materials.type,materials.description,materials.url` +
    `&fields[]=materials.file.id,materials.file.filename_download,materials.date_created` +
    `&deep[materials][_sort][]=sort` +
    `&deep[students][_sort][]=first_name`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );

  let classes: ClassData[] = [];
  if (classRes.ok) {
    const classJson = await classRes.json();
    classes = classJson.data || [];
  }

  const tabs = [
    { label: "Dashboard",     href: "/portal/teacher" },
    { label: "Community",     href: "/portal/community" },
    { label: "People",        href: "/portal/people" },
    { label: "Messages",      href: "/portal/messages" },
    { label: "Notifications", href: "/portal/notifications" },
  ];

  return (
    <main style={{ backgroundColor: "#0d0d1a", minHeight: "100vh", color: "#f0eeff" }}>
      <PortalNav
        tabs={tabs}
        userId={user.id}
        firstName={user.first_name}
        avatarId={user.avatar ?? null}
        role="teacher"
      />

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 40px" }}>
        {/* Header */}
        <div style={{ marginBottom: "48px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#7b61ff", fontWeight: 700, marginBottom: "8px" }}>
            Teacher Portal
          </div>
          <h1 style={{ fontSize: "36px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            Welcome back, {user.first_name}.
          </h1>
          <UserMeta lastAccess={user.last_access} role="Teacher" />
        </div>

        {classes.length === 0 ? (
          <div style={{
            backgroundColor: "rgba(26,26,46,0.5)",
            border: "1px solid rgba(123,97,255,0.15)",
            borderRadius: "12px", padding: "48px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>📚</div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#f0eeff", marginBottom: "12px" }}>
              No classes assigned yet
            </h2>
            <p style={{ color: "#a0a0c0", fontSize: "15px", lineHeight: 1.7, maxWidth: "400px", margin: "0 auto" }}>
              An admin will assign you to a class. Once assigned you can manage materials and see your students here.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {classes.map((cls) => (
              <ClassSection key={cls.id} cls={cls} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}



function formatLastLogin(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  <  2) return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours <  2) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  if (days  <  2) return "Yesterday";
  if (days  <  7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function UserMeta({ lastAccess, role }: {
  lastAccess?: string | null;
  role: string;
}) {
  const metaChip: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "rgba(123,97,255,0.07)",
    border: "1px solid rgba(123,97,255,0.15)",
    borderRadius: "100px",
    padding: "4px 12px",
    fontSize: "12px",
    color: "#808098",
    whiteSpace: "nowrap",
  };
  const dot: React.CSSProperties = {
    width: 6, height: 6, borderRadius: "50%",
    backgroundColor: "rgba(123,97,255,0.5)",
    flexShrink: 0,
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
      <span style={metaChip}>
        <span style={{ ...dot, backgroundColor: "#a590ff80" }} />
        <span style={{ color: "#606080" }}>Role</span>
        <span style={{ color: "#c0b8e8", fontWeight: 600 }}>{role}</span>
      </span>
      <span style={metaChip}>
        <span style={dot} />
        <span style={{ color: "#606080" }}>Last login</span>
        <span style={{ color: "#c0b8e8", fontWeight: 600 }}>{formatLastLogin(lastAccess)}</span>
      </span>
    </div>
  );
}

function NavAvatar({ avatarId, name }: { avatarId: string | null; name: string }) {
  if (avatarId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/portal/files/${avatarId}`}
        alt="avatar"
        style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(123,97,255,0.3)", flexShrink: 0 }}
      />
    );
  }
  return (
    <span style={{
      width: 28, height: 28, borderRadius: "50%",
      backgroundColor: "rgba(123,97,255,0.2)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontSize: "12px", fontWeight: 700, color: "#a590ff", flexShrink: 0,
    }}>
      {name[0]?.toUpperCase() || "?"}
    </span>
  );
}
