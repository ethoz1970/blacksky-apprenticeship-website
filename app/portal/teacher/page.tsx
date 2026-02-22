import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MaterialForm from "./MaterialForm";
import DeleteMaterialButton from "./DeleteMaterialButton";

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

type Student = { id: string; first_name: string; last_name?: string };
type Material = {
  id: number;
  title: string;
  type: string;
  description?: string | null;
  url?: string | null;
  file?: { id: string; filename_download: string } | null;
  date_created?: string;
};
type Class = {
  id: number;
  name: string;
  description?: string;
  discipline: string;
  students?: Student[];
  materials?: Material[];
};

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
    `${DIRECTUS_URL}/users/me?fields[]=id,first_name,last_name,avatar`,
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

  let classes: Class[] = [];
  if (classRes.ok) {
    const classJson = await classRes.json();
    classes = classJson.data || [];
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

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 40px" }}>
        {/* Header */}
        <div style={{ marginBottom: "48px" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#7b61ff", fontWeight: 700, marginBottom: "8px" }}>
            Teacher Portal
          </div>
          <h1 style={{ fontSize: "36px", fontWeight: 800, color: "white", letterSpacing: "-0.02em", margin: 0 }}>
            Welcome back, {user.first_name}.
          </h1>
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
          <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
            {classes.map((cls) => (
              <ClassSection key={cls.id} cls={cls} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ClassSection({ cls }: { cls: Class }) {
  const color = disciplineColors[cls.discipline] || "#7b61ff";
  const students = cls.students || [];
  const materials = cls.materials || [];

  return (
    <div>
      {/* Class header */}
      <div style={{
        backgroundColor: "rgba(26,26,46,0.6)",
        border: "1px solid rgba(123,97,255,0.15)",
        borderRadius: "12px", padding: "28px 32px",
        marginBottom: "32px",
      }}>
        <div style={{
          display: "inline-block",
          backgroundColor: `${color}15`,
          border: `1px solid ${color}35`,
          borderRadius: "100px", padding: "4px 12px",
          fontSize: "11px", fontWeight: 600, color: color,
          textTransform: "capitalize", marginBottom: "12px",
        }}>
          {cls.discipline}
        </div>
        <h2 style={{ fontSize: "26px", fontWeight: 800, color: "white", margin: "0 0 8px", letterSpacing: "-0.01em" }}>
          {cls.name}
        </h2>
        {cls.description && (
          <p style={{ color: "#a0a0c0", fontSize: "15px", lineHeight: 1.7, margin: 0 }}>{cls.description}</p>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "32px" }}>
        {/* Students column */}
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f0eeff", marginBottom: "16px" }}>
            Students ({students.length})
          </h3>
          {students.length === 0 ? (
            <p style={{ color: "#606080", fontSize: "14px" }}>No students enrolled yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {students.map((s) => (
                <div key={s.id} style={{
                  backgroundColor: "rgba(26,26,46,0.4)",
                  border: "1px solid rgba(123,97,255,0.1)",
                  borderRadius: "8px", padding: "10px 14px",
                  fontSize: "14px", color: "#d0d0e8",
                  display: "flex", alignItems: "center", gap: "10px",
                }}>
                  <span style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    backgroundColor: "rgba(123,97,255,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: 700, color: "#a590ff",
                    flexShrink: 0,
                  }}>
                    {(s.first_name || "?")[0].toUpperCase()}
                  </span>
                  {s.first_name} {s.last_name || ""}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Materials column */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f0eeff", margin: 0 }}>
              Materials ({materials.length})
            </h3>
          </div>

          {/* Add Material Form */}
          <div style={{ marginBottom: "16px" }}>
            <MaterialForm classId={cls.id} />
          </div>

          {materials.length === 0 ? (
            <p style={{ color: "#606080", fontSize: "14px" }}>No materials posted yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {materials.map((m) => (
                <MaterialRow key={m.id} material={m} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const VIEWABLE_EXTENSIONS = new Set([
  "pdf", "png", "jpg", "jpeg", "gif", "webp", "svg",
  "mp4", "webm", "mp3", "wav", "ogg",
]);

function isViewable(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return VIEWABLE_EXTENSIONS.has(ext);
}

function MaterialRow({ material }: { material: Material }) {
  const color = typeColors[material.type] || "#7b61ff";
  const icon = typeIcons[material.type] || "📎";
  const filename = material.file?.filename_download ?? "";
  const canView = !!material.file?.id && isViewable(filename);

  const btnStyle = (variant: "view" | "download" | "link"): React.CSSProperties => ({
    fontSize: "11px", fontWeight: 600, textDecoration: "none",
    display: "inline-flex", alignItems: "center", gap: "3px",
    padding: "3px 10px", borderRadius: "5px",
    ...(variant === "view"
      ? { color: "#f0eeff", backgroundColor: "rgba(123,97,255,0.15)", border: "1px solid rgba(123,97,255,0.3)" }
      : variant === "download"
      ? { color: "#a0a0c0", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }
      : { color: "#a590ff", backgroundColor: "rgba(165,144,255,0.08)", border: "1px solid rgba(165,144,255,0.2)" }),
  });

  return (
    <div style={{
      backgroundColor: "rgba(26,26,46,0.5)",
      border: "1px solid rgba(123,97,255,0.1)",
      borderRadius: "8px", padding: "14px 16px",
      display: "flex", alignItems: "flex-start", gap: "12px",
    }}>
      <span style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#f0eeff" }}>{material.title}</span>
          <span style={{
            backgroundColor: `${color}18`,
            border: `1px solid ${color}35`,
            borderRadius: "100px", padding: "1px 7px",
            fontSize: "10px", fontWeight: 600, color: color,
            textTransform: "capitalize",
          }}>
            {material.type}
          </span>
        </div>
        {material.description && (
          <p style={{ color: "#808098", fontSize: "12px", lineHeight: 1.5, margin: "0 0 6px" }}>{material.description}</p>
        )}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
          {material.url && (
            <a href={material.url} target="_blank" rel="noopener noreferrer" style={btnStyle("link")}>
              Open link →
            </a>
          )}
          {canView && (
            <a href={`/api/portal/files/${material.file!.id}?inline=1`} target="_blank" rel="noopener noreferrer" style={btnStyle("view")}>
              View ↗
            </a>
          )}
          {material.file?.id && (
            <a href={`/api/portal/files/${material.file.id}`} style={btnStyle("download")}>
              Download ↓
            </a>
          )}
        </div>
      </div>
      <DeleteMaterialButton materialId={material.id} />
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
