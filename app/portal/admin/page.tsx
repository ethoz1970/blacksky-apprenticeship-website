import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PortalNav from "../PortalNav";
import { ADMIN_TABS } from "./adminTabs";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const ADMIN_TOKEN  = process.env.DIRECTUS_API_TOKEN!;

type StatCard = { label: string; value: number; color: string; icon: string; href?: string };

function StatCard({ label, value, color, icon, href }: StatCard) {
  const inner = (
    <div style={{
      backgroundColor: "rgba(26,26,46,0.7)",
      border: `1px solid ${color}20`,
      borderRadius: "12px",
      padding: "24px 28px",
      display: "flex", alignItems: "center", gap: "20px",
      transition: "border-color 0.15s, transform 0.15s",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "12px", flexShrink: 0,
        backgroundColor: `${color}15`,
        border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "22px",
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: "28px", fontWeight: 800, color: "white", margin: 0, lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: "13px", color: "#808098", margin: "4px 0 0" }}>{label}</p>
      </div>
    </div>
  );

  if (href) {
    return <a href={href} style={{ textDecoration: "none", display: "block" }}>{inner}</a>;
  }
  return inner;
}

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get("directus_token")?.value;
  if (!token) redirect("/portal/login");

  const role = cookieStore.get("portal_role")?.value;
  if (role !== "admin") redirect("/portal/login");

  const meRes = await fetch(
    `${DIRECTUS_URL}/users/me?fields[]=id,first_name,last_name,avatar`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!meRes.ok) redirect("/portal/login");
  const { data: user } = await meRes.json();

  // Fetch stats using admin token
  const [usersRes, classesRes, postsRes, connectionsRes] = await Promise.all([
    fetch(`${DIRECTUS_URL}/users?filter[status][_neq]=archived&aggregate[count]=id`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }),
    fetch(`${DIRECTUS_URL}/items/classes?aggregate[count]=id`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }),
    fetch(`${DIRECTUS_URL}/items/community_posts?aggregate[count]=id`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }),
    fetch(`${DIRECTUS_URL}/items/user_connections?filter[status][_eq]=accepted&aggregate[count]=id`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }),
  ]);

  // Role breakdown
  const rolesRes = await fetch(`${DIRECTUS_URL}/roles?fields[]=id,name`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" });
  const roles: { id: string; name: string }[] = rolesRes.ok
    ? ((await rolesRes.json()).data ?? []) : [];

  const roleIds: Record<string, string> = {};
  for (const r of roles) roleIds[r.name.toLowerCase()] = r.id;

  const [studentsRes, teachersRes, applicantsRes] = await Promise.all([
    roleIds["student"] ? fetch(`${DIRECTUS_URL}/users?filter[role][_eq]=${roleIds["student"]}&filter[status][_eq]=active&aggregate[count]=id`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }) : null,
    roleIds["teacher"] ? fetch(`${DIRECTUS_URL}/users?filter[role][_eq]=${roleIds["teacher"]}&filter[status][_eq]=active&aggregate[count]=id`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }) : null,
    roleIds["applicant"] ? fetch(`${DIRECTUS_URL}/users?filter[role][_eq]=${roleIds["applicant"]}&filter[status][_eq]=active&aggregate[count]=id`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }) : null,
  ]);

  const count = async (res: Response | null) => {
    if (!res || !res.ok) return 0;
    const j = await res.json();
    return Number(j.data?.[0]?.count?.id ?? 0);
  };

  const [totalUsers, totalClasses, totalPosts, totalConnections,
         studentCount, teacherCount, applicantCount] = await Promise.all([
    count(usersRes), count(classesRes), count(postsRes), count(connectionsRes),
    count(studentsRes), count(teachersRes), count(applicantsRes),
  ]);

  // Fetch recent applicants
  const recentRes = roleIds["applicant"] ? await fetch(
    `${DIRECTUS_URL}/users?filter[role][_eq]=${roleIds["applicant"]}&filter[status][_eq]=active` +
    `&fields[]=id,first_name,last_name,email,date_created&sort[]=-date_created&limit=8`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
  ) : null;
  const recentApplicants: { id: string; first_name: string; last_name?: string; email: string; date_created: string }[] =
    recentRes?.ok ? ((await recentRes.json()).data ?? []) : [];

  return (
    <main style={{ backgroundColor: "#0d0d1a", minHeight: "100vh", color: "#f0eeff" }}>
      <PortalNav
        tabs={ADMIN_TABS}
        userId={user.id}
        firstName={user.first_name}
        avatarId={user.avatar}
        role="admin"
      />

      <div style={{ maxWidth: "1040px", margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#7b61ff", fontWeight: 700, marginBottom: "6px" }}>
            Admin Portal
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.02em" }}>
            Dashboard
          </h1>
        </div>

        {/* Primary stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px", marginBottom: "40px" }}>
          <StatCard label="Total Users"    value={totalUsers}       color="#7b61ff" icon="👥" href="/portal/admin/users" />
          <StatCard label="Students"       value={studentCount}     color="#61d4ff" icon="🎓" href="/portal/admin/users?tab=student" />
          <StatCard label="Teachers"       value={teacherCount}     color="#61ffb0" icon="📚" href="/portal/admin/users?tab=teacher" />
          <StatCard label="Applicants"     value={applicantCount}   color="#ffd761" icon="⏳" href="/portal/admin/users?tab=applicant" />
          <StatCard label="Classes"        value={totalClasses}     color="#ff6b6b" icon="🏫" href="/portal/admin/classes" />
          <StatCard label="Posts"          value={totalPosts}       color="#a590ff" icon="💬" href="/portal/community" />
          <StatCard label="Connections"    value={totalConnections} color="#61d4ff" icon="🔗" />
        </div>

        {/* Pending applicants */}
        <div style={{
          backgroundColor: "rgba(26,26,46,0.7)",
          border: "1px solid rgba(123,97,255,0.12)",
          borderRadius: "12px", overflow: "hidden",
        }}>
          <div style={{
            padding: "20px 24px",
            borderBottom: "1px solid rgba(123,97,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#f0eeff", margin: 0 }}>
                Pending Applicants
              </h2>
              <p style={{ fontSize: "13px", color: "#606080", margin: "4px 0 0" }}>
                Awaiting class assignment
              </p>
            </div>
            {applicantCount > 0 && (
              <a href="/portal/admin/users?tab=applicant" style={{
                padding: "7px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
                backgroundColor: "rgba(255,215,97,0.1)", border: "1px solid rgba(255,215,97,0.3)",
                color: "#ffd761", textDecoration: "none",
              }}>
                View all →
              </a>
            )}
          </div>

          {recentApplicants.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <p style={{ color: "#606080", fontSize: "14px", margin: 0 }}>
                No pending applicants. 🎉
              </p>
            </div>
          ) : (
            <div>
              {recentApplicants.map((applicant, i) => (
                <div key={applicant.id} style={{
                  display: "flex", alignItems: "center", gap: "16px",
                  padding: "14px 24px",
                  borderBottom: i < recentApplicants.length - 1 ? "1px solid rgba(123,97,255,0.07)" : "none",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    backgroundColor: "rgba(255,215,97,0.12)",
                    border: "1px solid rgba(255,215,97,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "14px", fontWeight: 700, color: "#ffd761", flexShrink: 0,
                  }}>
                    {applicant.first_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#e0d8ff", margin: 0 }}>
                      {applicant.first_name} {applicant.last_name ?? ""}
                    </p>
                    <p style={{ fontSize: "12px", color: "#606080", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {applicant.email}
                    </p>
                  </div>
                  <p style={{ fontSize: "11px", color: "#505068", flexShrink: 0 }}>
                    {new Date(applicant.date_created).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  <a href="/portal/admin/users?tab=applicant" style={{
                    padding: "5px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
                    backgroundColor: "rgba(123,97,255,0.12)", border: "1px solid rgba(123,97,255,0.3)",
                    color: "#a590ff", textDecoration: "none", flexShrink: 0,
                  }}>
                    Manage →
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
