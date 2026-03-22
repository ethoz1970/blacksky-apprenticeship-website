import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PortalNav from "../PortalNav";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  "https://directus-production-21fe.up.railway.app";

const ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN || "";

const typeColors: Record<string, string> = {
  document:   "#7b61ff",
  reading:    "#61d4ff",
  syllabus:   "#ffd761",
  assignment: "#ff6b6b",
  link:       "#61ffb0",
};

const typeIcons: Record<string, string> = {
  document:   "📄",
  reading:    "📖",
  syllabus:   "📋",
  assignment: "✏️",
  link:       "🔗",
};

const disciplineColors: Record<string, string> = {
  media:    "#ff6b6b",
  tech:     "#7b61ff",
  business: "#61d4ff",
  arts:     "#ffd761",
};

type Material = {
  id: number;
  title: string;
  type: string;
  description?: string | null;
  url?: string | null;
  file?: { id: string; filename_download: string } | null;
  date_created?: string;
  class_id?: {
    id: number;
    name: string;
    discipline: string;
  } | null;
};

type User = {
  id: string;
  first_name: string;
  class_id?: number | null;
  avatar?: string | null;
};

const ALL_TYPES = ["document", "reading", "syllabus", "assignment", "link"];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string; discipline?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("directus_token")?.value;
  if (!token) redirect("/portal/login");

  const role = cookieStore.get("portal_role")?.value || "student";

  const params = searchParams ? await searchParams : {};
  const filterType = params.type ?? "";
  const filterDiscipline = params.discipline ?? "";

  // Fetch current user
  const meRes = await fetch(
    `${DIRECTUS_URL}/users/me?fields[]=id,first_name,class_id,avatar`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!meRes.ok) redirect("/portal/login");
  const { data: user }: { data: User } = await meRes.json();

  // Build filter: students only see their class's materials; teachers/admins see all
  let materialsUrl =
    `${DIRECTUS_URL}/items/class_materials` +
    `?fields[]=id,title,type,description,url,date_created` +
    `&fields[]=file.id,file.filename_download` +
    `&fields[]=class_id.id,class_id.name,class_id.discipline` +
    `&sort[]=-date_created` +
    `&limit=200`;

  if (role === "student" && user.class_id) {
    materialsUrl += `&filter[class_id][_eq]=${user.class_id}`;
  }
  if (filterType) {
    materialsUrl += `&filter[type][_eq]=${encodeURIComponent(filterType)}`;
  }
  if (filterDiscipline) {
    materialsUrl += `&filter[class_id][discipline][_eq]=${encodeURIComponent(filterDiscipline)}`;
  }

  const matRes = await fetch(materialsUrl, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    cache: "no-store",
  });

  const materials: Material[] = matRes.ok
    ? ((await matRes.json()).data ?? [])
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

  // Unique disciplines from results (for admin/teacher filter)
  const disciplines = Array.from(
    new Set(
      materials
        .map((m) => m.class_id?.discipline)
        .filter(Boolean) as string[]
    )
  ).sort();

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
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            Library
          </h1>
          <p style={{ margin: "8px 0 0", color: "#7070a0", fontSize: "15px" }}>
            {role === "student"
              ? "Materials from your class"
              : "All course materials across every class"}
          </p>
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "32px" }}>
          {/* Type filters */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <FilterChip label="All types" href="/portal/library" active={!filterType} />
            {ALL_TYPES.map((t) => (
              <FilterChip
                key={t}
                label={`${typeIcons[t] ?? ""} ${t}`}
                href={`/portal/library?type=${t}${filterDiscipline ? "&discipline=" + filterDiscipline : ""}`}
                active={filterType === t}
                color={typeColors[t]}
              />
            ))}
          </div>

          {/* Discipline filters (teacher/admin only) */}
          {role !== "student" && disciplines.length > 0 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <FilterChip
                label="All disciplines"
                href={`/portal/library${filterType ? "?type=" + filterType : ""}`}
                active={!filterDiscipline}
              />
              {disciplines.map((d) => (
                <FilterChip
                  key={d}
                  label={d}
                  href={`/portal/library?discipline=${d}${filterType ? "&type=" + filterType : ""}`}
                  active={filterDiscipline === d}
                  color={disciplineColors[d]}
                />
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        {materials.length === 0 ? (
          <div style={{
            backgroundColor: "rgba(123,97,255,0.06)",
            border: "1px solid rgba(123,97,255,0.15)",
            borderRadius: "16px",
            padding: "60px 40px",
            textAlign: "center",
            color: "#7070a0",
          }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>📂</div>
            <div style={{ fontSize: "16px" }}>
              {role === "student" && !user.class_id
                ? "You haven't been assigned to a class yet."
                : "No materials found."}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {materials.map((mat) => {
              const color = typeColors[mat.type] ?? "#7b61ff";
              const icon = typeIcons[mat.type] ?? "📎";
              const discipline = mat.class_id?.discipline;
              const dColor = discipline ? (disciplineColors[discipline] ?? "#7070a0") : "#7070a0";

              // Resolve the link: file download or external URL
              const href = mat.file?.id
                ? `/api/portal/files/${mat.file.id}`
                : mat.url ?? null;

              return (
                <div
                  key={mat.id}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(123,97,255,0.12)",
                    borderRadius: "12px",
                    padding: "20px 24px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                  }}
                >
                  {/* Type icon */}
                  <div style={{
                    width: 42, height: 42, borderRadius: "10px",
                    backgroundColor: color + "18",
                    border: `1px solid ${color}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "20px", flexShrink: 0,
                  }}>
                    {icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: "15px", fontWeight: 700,
                            color: "#f0eeff", textDecoration: "none",
                          }}
                        >
                          {mat.title}
                        </a>
                      ) : (
                        <span style={{ fontSize: "15px", fontWeight: 700, color: "#f0eeff" }}>
                          {mat.title}
                        </span>
                      )}
                      <span style={{
                        backgroundColor: color + "22", color: color,
                        fontSize: "11px", fontWeight: 700,
                        padding: "2px 8px", borderRadius: "100px",
                        textTransform: "capitalize",
                      }}>
                        {mat.type}
                      </span>
                      {mat.class_id && role !== "student" && (
                        <span style={{
                          backgroundColor: dColor + "18", color: dColor,
                          fontSize: "11px", fontWeight: 600,
                          padding: "2px 8px", borderRadius: "100px",
                        }}>
                          {mat.class_id.name}
                        </span>
                      )}
                    </div>
                    {mat.description && (
                      <p style={{ margin: 0, fontSize: "13px", color: "#7070a0", lineHeight: 1.5 }}>
                        {mat.description}
                      </p>
                    )}
                  </div>

                  {/* Open link */}
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        backgroundColor: "rgba(123,97,255,0.12)",
                        border: "1px solid rgba(123,97,255,0.2)",
                        borderRadius: "8px",
                        padding: "8px 14px",
                        fontSize: "13px", fontWeight: 600, color: "#c0b0ff",
                        textDecoration: "none", flexShrink: 0,
                        transition: "background 0.15s",
                      }}
                    >
                      {mat.file?.id ? "Download" : "Open"} ↗
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function FilterChip({
  label, href, active, color,
}: {
  label: string;
  href: string;
  active: boolean;
  color?: string;
}) {
  const activeColor = color ?? "#7b61ff";
  return (
    <a
      href={href}
      style={{
        display: "inline-flex", alignItems: "center",
        padding: "6px 14px", borderRadius: "100px",
        fontSize: "12px", fontWeight: 600,
        textDecoration: "none",
        backgroundColor: active ? activeColor + "25" : "rgba(255,255,255,0.04)",
        border: `1px solid ${active ? activeColor + "60" : "rgba(255,255,255,0.08)"}`,
        color: active ? (color ?? "#c0b0ff") : "#7070a0",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </a>
  );
}
