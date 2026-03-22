import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PortalNav from "../PortalNav";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  "https://directus-production-21fe.up.railway.app";

const ADMIN_TOKEN = process.env.DIRECTUS_API_TOKEN || "";

const disciplineColors: Record<string, string> = {
  media:    "#ff6b6b",
  tech:     "#7b61ff",
  business: "#61d4ff",
  arts:     "#ffd761",
};

const typeIcons: Record<string, string> = {
  document:   "📄",
  reading:    "📖",
  syllabus:   "📋",
  assignment: "✏️",
  link:       "🔗",
};

type Material = {
  id: number;
  title: string;
  type: string;
  description?: string | null;
  url?: string | null;
  file?: { id: string; filename_download: string } | null;
};

type Teacher = {
  first_name: string;
  last_name?: string;
  avatar?: string | null;
  title?: string | null;
};

type Class = {
  id: number;
  name: string;
  description?: string;
  discipline: string;
  teacher?: Teacher | null;
  materials?: Material[];
};

type User = {
  id: string;
  first_name: string;
  class_id?: number | null;
  avatar?: string | null;
};

function AvatarCircle({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      backgroundColor: "rgba(123,97,255,0.2)",
      border: "1px solid rgba(123,97,255,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#a590ff", flexShrink: 0,
    }}>
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default async function ClassesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("directus_token")?.value;
  if (!token) redirect("/portal/login");

  const role = cookieStore.get("portal_role")?.value || "student";

  // Fetch current user
  const meRes = await fetch(
    `${DIRECTUS_URL}/users/me?fields[]=id,first_name,class_id,avatar`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!meRes.ok) redirect("/portal/login");
  const { data: user }: { data: User } = await meRes.json();

  // Admins and teachers see all classes; students see all but their own is highlighted
  const classesRes = await fetch(
    `${DIRECTUS_URL}/items/classes` +
    `?fields[]=id,name,description,discipline` +
    `&fields[]=teacher.first_name,teacher.last_name,teacher.avatar,teacher.title` +
    `&fields[]=materials.id,materials.title,materials.type` +
    `&sort[]=name`,
    { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }, cache: "no-store" }
  );

  const classes: Class[] = classesRes.ok
    ? ((await classesRes.json()).data ?? [])
    : [];

  const tabs =
    role === "admin"
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

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 40px" }}>
        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            Classes
          </h1>
          <p style={{ margin: "8px 0 0", color: "#7070a0", fontSize: "15px" }}>
            All active apprenticeship tracks
          </p>
        </div>

        {classes.length === 0 ? (
          <div style={{
            backgroundColor: "rgba(123,97,255,0.06)",
            border: "1px solid rgba(123,97,255,0.15)",
            borderRadius: "16px",
            padding: "60px 40px",
            textAlign: "center",
            color: "#7070a0",
          }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>📚</div>
            <div style={{ fontSize: "16px" }}>No classes have been set up yet.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {classes.map((cls) => {
              const isMyClass = cls.id === user.class_id;
              const color = disciplineColors[cls.discipline] ?? "#7b61ff";
              const materialCount = cls.materials?.length ?? 0;
              const teacherName = cls.teacher
                ? `${cls.teacher.first_name}${cls.teacher.last_name ? " " + cls.teacher.last_name : ""}`
                : null;

              return (
                <div
                  key={cls.id}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border: `1px solid ${isMyClass ? color + "55" : "rgba(123,97,255,0.12)"}`,
                    borderRadius: "16px",
                    padding: "28px 32px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Discipline accent line */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0,
                    height: "3px", backgroundColor: color,
                  }} />

                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                    <div style={{ flex: 1 }}>
                      {/* Name + badges */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "8px" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#f0eeff" }}>
                          {cls.name}
                        </h2>
                        <span style={{
                          backgroundColor: color + "22",
                          color: color,
                          fontSize: "11px", fontWeight: 700,
                          padding: "3px 10px", borderRadius: "100px",
                          textTransform: "uppercase", letterSpacing: "0.05em",
                        }}>
                          {cls.discipline}
                        </span>
                        {isMyClass && (
                          <span style={{
                            backgroundColor: "rgba(123,97,255,0.2)",
                            color: "#c0b0ff",
                            fontSize: "11px", fontWeight: 700,
                            padding: "3px 10px", borderRadius: "100px",
                          }}>
                            ✓ My Class
                          </span>
                        )}
                      </div>

                      {cls.description && (
                        <p style={{ margin: "0 0 16px", color: "#9090c0", fontSize: "14px", lineHeight: 1.6 }}>
                          {cls.description}
                        </p>
                      )}

                      {/* Meta row */}
                      <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                        {teacherName && (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <AvatarCircle name={teacherName} size={24} />
                            <span style={{ fontSize: "13px", color: "#7070a0" }}>
                              {teacherName}
                              {cls.teacher?.title && (
                                <span style={{ color: "#555580" }}> · {cls.teacher.title}</span>
                              )}
                            </span>
                          </div>
                        )}
                        {materialCount > 0 && (
                          <span style={{ fontSize: "13px", color: "#7070a0" }}>
                            {materialCount} material{materialCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {/* Material type pills */}
                      {cls.materials && cls.materials.length > 0 && (
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "14px" }}>
                          {Array.from(new Set(cls.materials.map((m) => m.type))).map((type) => (
                            <span key={type} style={{
                              backgroundColor: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              fontSize: "12px", color: "#7070a0",
                              padding: "3px 10px", borderRadius: "100px",
                            }}>
                              {typeIcons[type] ?? "📎"} {type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
