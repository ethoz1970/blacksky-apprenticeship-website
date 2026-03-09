import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const ADMIN_TOKEN = process.env.DIRECTUS_API_TOKEN;

export async function GET(req: NextRequest) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify caller identity
  const meRes = await fetch(`${DIRECTUS_URL}/users/me?fields[]=id`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!meRes.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await meRes.json();

  // Use admin token to list all users (students/teachers may not have permission to list others)
  const authHeader = ADMIN_TOKEN
    ? { Authorization: `Bearer ${ADMIN_TOKEN}` }
    : { Authorization: `Bearer ${token}` };

  const usersRes = await fetch(
    `${DIRECTUS_URL}/users?fields[]=id,first_name,last_name,avatar,class_id,role.name` +
    `&filter[role][name][_in]=student,teacher&sort[]=first_name&limit=200`,
    { headers: authHeader, cache: "no-store" }
  );
  if (!usersRes.ok) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: usersRes.status });
  }
  const { data: rawUsers } = await usersRes.json();

  // Fetch classes for name lookup
  const classesRes = await fetch(
    `${DIRECTUS_URL}/items/classes?fields[]=id,name,teacher&limit=200`,
    { headers: authHeader, cache: "no-store" }
  );
  let classMap: Record<number, string> = {};
  let teacherClassMap: Record<string, string> = {};
  if (classesRes.ok) {
    const { data: classes } = await classesRes.json();
    for (const cls of classes ?? []) {
      classMap[cls.id] = cls.name;
      if (cls.teacher) {
        teacherClassMap[cls.teacher] = cls.name;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = (rawUsers ?? []).map((u: any) => {
    const roleName = u.role?.name ?? "student";
    let className: string | null = null;
    if (roleName === "teacher") {
      className = teacherClassMap[u.id] ?? null;
    } else {
      className = u.class_id ? classMap[u.class_id] ?? null : null;
    }
    return {
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name ?? "",
      avatar: u.avatar,
      role_name: roleName,
      class_name: className,
    };
  });

  return NextResponse.json({ users, my_id: me.id });
}
