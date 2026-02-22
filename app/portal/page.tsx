import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  "https://directus-production-21fe.up.railway.app";

/**
 * /portal — reads auth cookie and redirects to the role-appropriate dashboard.
 */
export default async function PortalPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("directus_token")?.value;

  if (!token) {
    redirect("/portal/login");
  }

  // Get user role from Directus
  const meRes = await fetch(
    `${DIRECTUS_URL}/users/me?fields[]=role.name`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  if (!meRes.ok) {
    redirect("/portal/login");
  }

  const { data } = await meRes.json();
  const roleName: string = (data?.role?.name || "").toLowerCase();

  if (roleName === "teacher") redirect("/portal/teacher");
  if (roleName === "student") redirect("/portal/student");
  if (roleName === "applicant") redirect("/portal/applicant");

  // Unknown role — go back to login
  redirect("/portal/login");
}
