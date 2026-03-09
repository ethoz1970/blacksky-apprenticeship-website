import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PortalNav from "../../PortalNav";
import { ADMIN_TABS } from "../adminTabs";
import ClassManager from "./ClassManager";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const ADMIN_TOKEN  = process.env.DIRECTUS_API_TOKEN!;

export default async function AdminClassesPage() {
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

  // Get teacher role ID
  const rolesRes = await fetch(`${DIRECTUS_URL}/roles?fields[]=id,name`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store",
  });
  const roles: { id: string; name: string }[] = rolesRes.ok ? ((await rolesRes.json()).data ?? []) : [];
  const teacherRoleId = roles.find(r => r.name.toLowerCase() === "teacher")?.id ?? "";

  const [classesRes, teachersRes] = await Promise.all([
    fetch(
      `${DIRECTUS_URL}/items/classes` +
      `?fields[]=id,name,description,discipline` +
      `&fields[]=teacher.id,teacher.first_name,teacher.last_name` +
      `&fields[]=students.id,students.first_name,students.last_name` +
      `&sort[]=name&limit=-1`,
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
    ),
    teacherRoleId
      ? fetch(`${DIRECTUS_URL}/users?filter[role][_eq]=${teacherRoleId}&filter[status][_eq]=active&fields[]=id,first_name,last_name&sort[]=first_name&limit=100`,
          { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" })
      : null,
  ]);

  const classes  = classesRes.ok  ? ((await classesRes.json()).data  ?? []) : [];
  const teachers = teachersRes?.ok ? ((await teachersRes.json()).data ?? []) : [];

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
        <div style={{ marginBottom: "32px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#7b61ff", fontWeight: 700, marginBottom: "6px" }}>
            Admin Portal
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: 800, color: "white", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Classes
          </h1>
          <p style={{ fontSize: "14px", color: "#606080", margin: 0 }}>
            Create and manage courses, assign teachers and disciplines.
          </p>
        </div>

        <ClassManager initialClasses={classes} teachers={teachers} />
      </div>
    </main>
  );
}
