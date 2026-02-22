import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL ||
  "https://directus-production-21fe.up.railway.app";

const disciplineColors: Record<string, string> = {
  media: "#ff6b6b",
  tech: "#7b61ff",
  business: "#61d4ff",
  arts: "#ffd761",
};

const typeColors: Record<string, string> = {
  document: "#7b61ff",
  reading: "#61d4ff",
  syllabus: "#ffd761",
  assignment: "#ff6b6b",
  link: "#61ffb0",
};

const typeIcons: Record<string, string> = {
  document: "📄",
  reading: "📖",
  syllabus: "📋",
  assignment: "✏️",
  link: "🔗",
};

type Material = {
  id: number;
  title: string;
  type: string;
  description?: string | null;
  url?: string | null;
  file?: { id: string; filename_download: string } | null;
  date_created?: string;
};

type Teacher = {
  first_name: string;
  last_name?: string;
  avatar?: string | null;
  title?: string | null;
  description?: string | null;
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
  last_name?: string;
  class_id?: number | null;
  avatar?: string | null;
  date_created?: string | null;
  last_access?: string | null;
};

export default async function StudentPortalPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("directus_token")?.value;

  if (!token) redirect("/portal/login");

  // Role is stored at login — students can't expand role.name via their own token
  const role = cookieStore.get("portal_role")?.value || "";
  if (role === "teacher") redirect("/portal/teacher");
  if (role && role !== "student") {
    // Applicant or unknown role — show pending state (still fetch name if possible)
    const meRes = await fetch(
      `${DIRECTUS_URL}/users/me?fields[]=first_name`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    const firstName = meRes.ok ? (await meRes.json())?.data?.first_name || "" : "";
    return <PendingView firstName={firstName} />;
  }

  // Fetch the current user (no role.name needed — we already have it from cookie)
  const meRes = await fetch(
    `${DIRECTUS_URL}/users/me?fields[]=id,first_name,last_name,class_id,avatar,date_created,last_access`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );

  if (!meRes.ok) redirect("/portal/login");

  const { data: user }: { data: User } = await meRes.json();

  // Fetch the student's class with materials and teacher
  let classData: Class | null = null;
  if (user.class_id) {
    const classRes = await fetch(
      `${DIRECTUS_URL}/items/classes/${user.class_id}` +
      `?fields[]=id,name,description,discipline` +
      `&fields[]=teacher.first_name,teacher.last_name,teacher.avatar,teacher.title,teacher.description` +
      `&fields[]=materials.id,materials.title,materials.type,materials.description,materials.url,materials.file.id,materials.file.filename_download,materials.date_created` +
      `&deep[materials][_sort][]=sort&deep[materials][_sort][]=date_created`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );

    if (classRes.ok) {
      const classJson = await classRes.json();
      classData = classJson.data;
    }
  }

  return (
    <main style={{ backgroundColor: "#0d0d1a", minHeight: "100vh", color: "#f0eeff" }}>
      {/* Nav */}
      <nav style={{
        padding: "16px 40px",
        borderBottom: "1px solid rgba(123,97,255,0.1)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        backgroundColor: "rgba(13,13,26,0.9)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <a href="/" style={{ fontSize: "17px", fontWeight: 700, color: "#f0eeff", textDecoration: "none" }}>
          Blacksky<span style={{ color: "#7b61ff" }}> Up</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <a href="/portal/profile" style={{
            display: "flex", alignItems: "center", gap: "10px",
            textDecoration: "none", color: "#a0a0c0",
          }}>
            <NavAvatar avatarId={user.avatar ?? null} name={user.first_name || "?"} />
            <span style={{ fontSize: "14px" }}>{user.first_name} {user.last_name || ""}</span>
          </a>
          <form action="/api/portal/logout" method="POST">
            <button type="submit" style={{
              backgroundColor: "transparent",
              border: "1px solid rgba(123,97,255,0.3)",
              borderRadius: "6px", color: "#a0a0c0",
              cursor: "pointer", fontFamily: "inherit",
              fontSize: "13px", padding: "6px 14px",
            }}>
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "48px 40px" }}>
        {/* Header */}
        <div style={{ marginBottom: "48px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#7b61ff", fontWeight: 700, marginBottom: "8px" }}>
            Student Portal
          </div>
          <h1 style={{ fontSize: "36px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", margin: "0 0 16px" }}>
            Welcome back, {user.first_name}.
          </h1>
          <UserMeta dateCreated={user.date_created} lastAccess={user.last_access} role="Student" />
        </div>

        {!classData ? (
          <div style={{
            backgroundColor: "rgba(26,26,46,0.5)",
            border: "1px solid rgba(123,97,255,0.15)",
            borderRadius: "12px", padding: "48px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>⏳</div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#f0eeff", marginBottom: "12px" }}>
              No class assigned yet
            </h2>
            <p style={{ color: "#a0a0c0", fontSize: "15px", lineHeight: 1.7, maxWidth: "400px", margin: "0 auto" }}>
              Your class assignment is pending. You&apos;ll get access to your course materials once you&apos;re enrolled.
            </p>
          </div>
        ) : (
          <>
            {/* Class card */}
            <div style={{
              backgroundColor: "rgba(26,26,46,0.6)",
              border: "1px solid rgba(123,97,255,0.15)",
              borderRadius: "12px", padding: "32px",
              marginBottom: "40px",
            }}>
              {/* Discipline tag + class name + description */}
              <div style={{ marginBottom: classData.teacher ? "28px" : 0 }}>
                <div style={{
                  display: "inline-block",
                  backgroundColor: `${disciplineColors[classData.discipline] || "#7b61ff"}15`,
                  border: `1px solid ${disciplineColors[classData.discipline] || "#7b61ff"}35`,
                  borderRadius: "100px", padding: "4px 12px",
                  fontSize: "11px", fontWeight: 600,
                  color: disciplineColors[classData.discipline] || "#7b61ff",
                  textTransform: "capitalize",
                  marginBottom: "12px",
                }}>
                  {classData.discipline}
                </div>
                <h2 style={{ fontSize: "24px", fontWeight: 800, color: "white", margin: "0 0 8px", letterSpacing: "-0.01em" }}>
                  {classData.name}
                </h2>
                {classData.description && (
                  <p style={{ color: "#a0a0c0", fontSize: "15px", lineHeight: 1.7, margin: 0 }}>
                    {classData.description}
                  </p>
                )}
              </div>

              {/* Teacher profile card */}
              {classData.teacher && (
                <TeacherCard teacher={classData.teacher} />
              )}
            </div>

            {/* Materials */}
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#f0eeff", marginBottom: "24px" }}>
                Course Materials
              </h2>

              {(!classData.materials || classData.materials.length === 0) ? (
                <div style={{
                  backgroundColor: "rgba(26,26,46,0.3)",
                  border: "1px dashed rgba(123,97,255,0.18)",
                  borderRadius: "12px", padding: "40px",
                  textAlign: "center",
                }}>
                  <p style={{ color: "#606080", fontSize: "15px", margin: 0 }}>
                    No materials posted yet. Check back soon.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {classData.materials.map((material) => (
                    <MaterialCard key={material.id} material={material} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function formatMemberSince(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
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

function UserMeta({ dateCreated, lastAccess, role }: {
  dateCreated?: string | null;
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
        <span style={{ color: "#606080" }}>Member since</span>
        <span style={{ color: "#c0b8e8", fontWeight: 600 }}>{formatMemberSince(dateCreated)}</span>
      </span>
      <span style={metaChip}>
        <span style={dot} />
        <span style={{ color: "#606080" }}>Last login</span>
        <span style={{ color: "#c0b8e8", fontWeight: 600 }}>{formatLastLogin(lastAccess)}</span>
      </span>
    </div>
  );
}

function TeacherCard({ teacher }: { teacher: Teacher }) {
  const fullName = `${teacher.first_name} ${teacher.last_name || ""}`.trim();
  const initials = [teacher.first_name?.[0], teacher.last_name?.[0]]
    .filter(Boolean).join("").toUpperCase() || "?";

  return (
    <div style={{
      borderTop: "1px solid rgba(123,97,255,0.12)",
      paddingTop: "24px",
      display: "flex",
      alignItems: "flex-start",
      gap: "18px",
    }}>
      {/* Avatar */}
      <div style={{ flexShrink: 0 }}>
        {teacher.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/portal/files/${teacher.avatar}`}
            alt={fullName}
            style={{
              width: 64, height: 64, borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid rgba(123,97,255,0.35)",
              boxShadow: "0 0 0 4px rgba(123,97,255,0.08)",
            }}
          />
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            backgroundColor: "rgba(123,97,255,0.15)",
            border: "2px solid rgba(123,97,255,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px", fontWeight: 800, color: "#a590ff",
            boxShadow: "0 0 0 4px rgba(123,97,255,0.06)",
          }}>
            {initials}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: "4px" }}>
        <div style={{
          fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase",
          color: "#7b61ff", fontWeight: 700, marginBottom: "4px",
        }}>
          Your Instructor
        </div>
        <div style={{ fontSize: "17px", fontWeight: 700, color: "#f0eeff", marginBottom: "2px" }}>
          {fullName}
        </div>
        {teacher.title && (
          <div style={{ fontSize: "13px", color: "#7b61ff", fontWeight: 500, marginBottom: "6px" }}>
            {teacher.title}
          </div>
        )}
        {teacher.description && (
          <p style={{
            color: "#a0a0c0", fontSize: "14px", lineHeight: 1.65,
            margin: 0, maxWidth: "560px",
          }}>
            {teacher.description}
          </p>
        )}
      </div>
    </div>
  );
}

// File types the browser can display inline without a plugin
const VIEWABLE_EXTENSIONS = new Set([
  "pdf", "png", "jpg", "jpeg", "gif", "webp", "svg",
  "mp4", "webm", "mp3", "wav", "ogg",
]);

function isViewable(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return VIEWABLE_EXTENSIONS.has(ext);
}

function MaterialCard({ material }: { material: Material }) {
  const color = typeColors[material.type] || "#7b61ff";
  const icon = typeIcons[material.type] || "📎";
  const hasLink = material.url;
  const hasFile = material.file?.id;
  const filename = material.file?.filename_download ?? "";
  const canView = hasFile && isViewable(filename);

  const linkBase: React.CSSProperties = {
    fontSize: "13px", fontWeight: 600, textDecoration: "none",
    display: "inline-flex", alignItems: "center", gap: "4px",
    padding: "5px 12px", borderRadius: "6px",
  };

  return (
    <div style={{
      backgroundColor: "rgba(26,26,46,0.5)",
      border: "1px solid rgba(123,97,255,0.12)",
      borderRadius: "10px",
      padding: "20px 24px",
      display: "flex", alignItems: "flex-start",
      gap: "16px",
    }}>
      <div style={{ fontSize: "20px", flexShrink: 0, marginTop: "2px" }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#f0eeff" }}>{material.title}</span>
          <span style={{
            backgroundColor: `${color}18`,
            border: `1px solid ${color}35`,
            borderRadius: "100px", padding: "2px 8px",
            fontSize: "11px", fontWeight: 600, color: color,
            textTransform: "capitalize",
          }}>
            {material.type}
          </span>
        </div>
        {material.description && (
          <p style={{ color: "#a0a0c0", fontSize: "14px", lineHeight: 1.6, margin: "0 0 12px" }}>
            {material.description}
          </p>
        )}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {hasLink && (
            <a
              href={material.url!}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...linkBase,
                color: color,
                backgroundColor: `${color}12`,
                border: `1px solid ${color}30`,
              }}
            >
              Open link →
            </a>
          )}

          {canView && (
            <a
              href={`/api/portal/files/${material.file!.id}?inline=1`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...linkBase,
                color: "#f0eeff",
                backgroundColor: "rgba(123,97,255,0.15)",
                border: "1px solid rgba(123,97,255,0.3)",
              }}
            >
              View ↗
            </a>
          )}

          {hasFile && (
            <a
              href={`/api/portal/files/${material.file!.id}`}
              style={{
                ...linkBase,
                color: "#a0a0c0",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              Download ↓
            </a>
          )}
        </div>
      </div>
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

function PendingView({ firstName }: { firstName: string }) {
  return (
    <main style={{ backgroundColor: "#0d0d1a", minHeight: "100vh", color: "#f0eeff", display: "flex", flexDirection: "column" }}>
      <nav style={{ padding: "20px 40px", borderBottom: "1px solid rgba(123,97,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href="/" style={{ fontSize: "17px", fontWeight: 700, color: "#f0eeff", textDecoration: "none" }}>
          Blacksky<span style={{ color: "#7b61ff" }}> Up</span>
        </a>
        <form action="/api/portal/logout" method="POST">
          <button type="submit" style={{ backgroundColor: "transparent", border: "1px solid rgba(123,97,255,0.3)", borderRadius: "6px", color: "#a0a0c0", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", padding: "6px 14px" }}>Sign out</button>
        </form>
      </nav>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <div style={{ textAlign: "center", maxWidth: "480px" }}>
          <div style={{ fontSize: "48px", marginBottom: "20px" }}>⏳</div>
          <h1 style={{ fontSize: "32px", fontWeight: 800, color: "white", marginBottom: "16px" }}>
            Almost there, {firstName}.
          </h1>
          <p style={{ color: "#a0a0c0", fontSize: "16px", lineHeight: 1.75 }}>
            Your application is being reviewed. You&apos;ll receive an email once you&apos;ve been accepted and placed in a class.
          </p>
        </div>
      </div>
    </main>
  );
}
