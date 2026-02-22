import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * /portal — reads the portal_role cookie (set at login) and redirects to the
 * role-appropriate dashboard. Falls back to /portal/login if no session.
 */
export default async function PortalPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("directus_token")?.value;

  if (!token) {
    redirect("/portal/login");
  }

  // Role is stored at login to avoid re-fetching (students can't expand role.name)
  const role = cookieStore.get("portal_role")?.value || "";

  if (role === "teacher") redirect("/portal/teacher");
  if (role === "student") redirect("/portal/student");
  if (role === "applicant") redirect("/portal/applicant");

  // Unknown or missing role — go back to login
  redirect("/portal/login");
}
