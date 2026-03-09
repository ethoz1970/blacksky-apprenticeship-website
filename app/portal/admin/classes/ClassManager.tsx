"use client";

import { useState } from "react";

type Teacher = { id: string; first_name: string; last_name?: string };
type Student = { id: string; first_name: string; last_name?: string };

type ClassRow = {
  id: number;
  name: string;
  description?: string;
  discipline: string;
  teacher?: Teacher | null;
  students?: Student[];
};

type Props = {
  initialClasses: ClassRow[];
  teachers: Teacher[];
};

const DISCIPLINES = ["media", "tech", "business", "arts"];

const DISCIPLINE_COLORS: Record<string, string> = {
  media: "#ff6b6b", tech: "#7b61ff", business: "#61d4ff", arts: "#ffd761",
};

const DISCIPLINE_GRADIENTS: Record<string, string> = {
  media:    "linear-gradient(135deg, rgba(255,107,107,0.15), rgba(255,107,107,0.04))",
  tech:     "linear-gradient(135deg, rgba(123,97,255,0.15), rgba(123,97,255,0.04))",
  business: "linear-gradient(135deg, rgba(97,212,255,0.15), rgba(97,212,255,0.04))",
  arts:     "linear-gradient(135deg, rgba(255,215,97,0.15), rgba(255,215,97,0.04))",
};

function TeacherName({ teacher }: { teacher?: Teacher | null }) {
  if (!teacher) return <span style={{ color: "#505068", fontStyle: "italic" }}>Unassigned</span>;
  return <span>{teacher.first_name} {teacher.last_name ?? ""}</span>;
}

export default function ClassManager({ initialClasses, teachers }: Props) {
  const [classes, setClasses]   = useState<ClassRow[]>(initialClasses);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form state
  const emptyForm = { name: "", description: "", discipline: "tech", teacher: "" };
  const [form, setForm] = useState(emptyForm);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setCreating(true);
  }

  function openEdit(cls: ClassRow) {
    setForm({
      name:        cls.name,
      description: cls.description ?? "",
      discipline:  cls.discipline,
      teacher:     cls.teacher?.id ?? "",
    });
    setCreating(false);
    setEditingId(cls.id);
  }

  function cancelForm() {
    setCreating(false);
    setEditingId(null);
  }

  async function submitCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/portal/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:        form.name.trim(),
        description: form.description.trim(),
        discipline:  form.discipline,
        teacher:     form.teacher || null,
      }),
    });
    if (res.ok) {
      const { data } = await res.json();
      // Re-attach teacher object for display
      const teacherObj = teachers.find(t => t.id === form.teacher) ?? null;
      setClasses(prev => [...prev, { ...data, teacher: teacherObj, students: [] }]);
      cancelForm();
    } else {
      alert("Failed to create class.");
    }
    setSaving(false);
  }

  async function submitEdit(classId: number) {
    setSaving(true);
    const res = await fetch(`/api/portal/admin/classes/${classId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:        form.name.trim(),
        description: form.description.trim(),
        discipline:  form.discipline,
        teacher:     form.teacher || null,
      }),
    });
    if (res.ok) {
      const teacherObj = teachers.find(t => t.id === form.teacher) ?? null;
      setClasses(prev => prev.map(c => c.id === classId
        ? { ...c, name: form.name.trim(), description: form.description, discipline: form.discipline, teacher: teacherObj }
        : c
      ));
      cancelForm();
    } else {
      alert("Failed to update class.");
    }
    setSaving(false);
  }

  async function deleteClass(classId: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(classId);
    const res = await fetch(`/api/portal/admin/classes/${classId}`, { method: "DELETE" });
    if (res.ok) {
      setClasses(prev => prev.filter(c => c.id !== classId));
    } else {
      alert("Failed to delete class.");
    }
    setDeletingId(null);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "9px 12px",
    borderRadius: "8px", fontSize: "14px",
    backgroundColor: "rgba(123,97,255,0.06)", border: "1px solid rgba(123,97,255,0.2)",
    color: "#f0eeff", outline: "none",
  };

  function ClassForm({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) {
    return (
      <div style={{
        backgroundColor: "rgba(13,13,26,0.8)",
        border: "1px solid rgba(123,97,255,0.2)",
        borderRadius: "12px", padding: "24px", marginBottom: "24px",
      }}>
        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f0eeff", margin: "0 0 20px" }}>
          {creating ? "New Class" : "Edit Class"}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label style={{ fontSize: "12px", color: "#707090", fontWeight: 600, display: "block", marginBottom: "6px" }}>Class Name *</label>
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. LLM 101" />
          </div>
          <div>
            <label style={{ fontSize: "12px", color: "#707090", fontWeight: 600, display: "block", marginBottom: "6px" }}>Discipline *</label>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={form.discipline}
              onChange={e => setForm(f => ({ ...f, discipline: e.target.value }))}
            >
              {DISCIPLINES.map(d => (
                <option key={d} value={d} style={{ backgroundColor: "#1a1a2e", textTransform: "capitalize" }}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "12px", color: "#707090", fontWeight: 600, display: "block", marginBottom: "6px" }}>Description</label>
          <textarea
            style={{ ...inputStyle, resize: "vertical", minHeight: "80px" }}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Brief description of this course…"
          />
        </div>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "12px", color: "#707090", fontWeight: 600, display: "block", marginBottom: "6px" }}>Assigned Teacher</label>
          <select
            style={{ ...inputStyle, cursor: "pointer" }}
            value={form.teacher}
            onChange={e => setForm(f => ({ ...f, teacher: e.target.value }))}
          >
            <option value="" style={{ backgroundColor: "#1a1a2e" }}>— No teacher assigned —</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id} style={{ backgroundColor: "#1a1a2e" }}>
                {t.first_name} {t.last_name ?? ""}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onSubmit}
            disabled={saving || !form.name.trim()}
            style={{
              padding: "9px 22px", borderRadius: "8px", border: "none",
              backgroundColor: saving || !form.name.trim() ? "rgba(123,97,255,0.3)" : "#7b61ff",
              color: "white", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : submitLabel}
          </button>
          <button
            onClick={cancelForm}
            disabled={saving}
            style={{
              padding: "9px 18px", borderRadius: "8px", border: "1px solid rgba(123,97,255,0.2)",
              backgroundColor: "transparent", color: "#707090", fontSize: "14px", cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Create form */}
      {creating && <ClassForm onSubmit={submitCreate} submitLabel="Create Class" />}

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <p style={{ fontSize: "14px", color: "#606080", margin: 0 }}>{classes.length} class{classes.length !== 1 ? "es" : ""}</p>
        {!creating && !editingId && (
          <button
            onClick={openCreate}
            style={{
              padding: "9px 20px", borderRadius: "8px", border: "none",
              backgroundColor: "#7b61ff", color: "white",
              fontSize: "13px", fontWeight: 700, cursor: "pointer",
            }}
          >
            + New Class
          </button>
        )}
      </div>

      {/* Class list */}
      {classes.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px",
          border: "1px dashed rgba(123,97,255,0.2)", borderRadius: "12px",
        }}>
          <p style={{ color: "#606080" }}>No classes yet. Create your first one above.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {classes.map(cls => {
            const color    = DISCIPLINE_COLORS[cls.discipline] ?? "#7b61ff";
            const gradient = DISCIPLINE_GRADIENTS[cls.discipline] ?? DISCIPLINE_GRADIENTS.tech;
            const isEditing = editingId === cls.id;

            return (
              <div key={cls.id}>
                {isEditing && <ClassForm onSubmit={() => submitEdit(cls.id)} submitLabel="Save Changes" />}
                {!isEditing && (
                  <div style={{
                    background: gradient,
                    border: `1px solid ${color}25`,
                    borderRadius: "12px", padding: "20px 24px",
                    display: "flex", gap: "16px", alignItems: "flex-start",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: "11px", fontWeight: 600, padding: "2px 10px", borderRadius: "100px",
                          backgroundColor: `${color}18`, border: `1px solid ${color}35`, color: color,
                          textTransform: "capitalize",
                        }}>
                          {cls.discipline}
                        </span>
                        <span style={{ fontSize: "10px", color: "#505068" }}>
                          {cls.students?.length ?? 0} student{(cls.students?.length ?? 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#f0eeff", margin: "0 0 4px" }}>{cls.name}</h3>
                      <p style={{ fontSize: "13px", color: "#a0a0c0", margin: "0 0 8px", lineHeight: 1.5 }}>
                        {cls.description || <span style={{ color: "#505068", fontStyle: "italic" }}>No description</span>}
                      </p>
                      <p style={{ fontSize: "12px", color: "#707090", margin: 0 }}>
                        👤 <TeacherName teacher={cls.teacher} />
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexShrink: 0, marginTop: "4px" }}>
                      <button
                        onClick={() => openEdit(cls)}
                        style={{
                          padding: "6px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 600,
                          border: "1px solid rgba(123,97,255,0.25)", backgroundColor: "rgba(123,97,255,0.1)",
                          color: "#a590ff", cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteClass(cls.id, cls.name)}
                        disabled={deletingId === cls.id}
                        style={{
                          padding: "6px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 600,
                          border: "1px solid rgba(255,107,107,0.2)", backgroundColor: "rgba(255,107,107,0.07)",
                          color: "#ff6b6b", cursor: "pointer",
                        }}
                      >
                        {deletingId === cls.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
