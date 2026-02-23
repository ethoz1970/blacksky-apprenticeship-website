import { createDirectus, rest, readItems } from '@directus/sdk';

export type ClassMaterial = {
  id: number;
  class_id: number;
  title: string;
  /** document | reading | syllabus | assignment | link */
  type: 'document' | 'reading' | 'syllabus' | 'assignment' | 'link';
  description?: string | null;
  /** M2O → directus_files — uploaded file */
  file?: { id: string; filename_download: string; type: string } | null;
  /** External URL (used when type = link or reading) */
  url?: string | null;
  sort?: number | null;
  date_created?: string;
};

export type Class = {
  id: number;
  name: string;
  description: string;
  discipline: 'media' | 'tech' | 'business' | 'arts';
  /** M2O — assigned teacher (any Directus user) */
  teacher?: { id: string; first_name: string; last_name: string } | null;
  /** O2M — class materials (documents, readings, syllabus, assignments, links) */
  materials?: ClassMaterial[];
  /** O2M — enrolled (approved) students whose class_id = this class */
  students?: { id: string; first_name: string; last_name: string }[];
  /** O2M — pending applications whose selected_class = this class */
  pending_applicants?: { id: number; name: string; status: string }[];
};

type Schema = {
  classes: Class[];
  class_materials: ClassMaterial[];
};

const directus = createDirectus<Schema>(
  process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://directus-production-21fe.up.railway.app'
).with(rest());

export async function getCourse(id: number): Promise<Class | null> {
  try {
    const DIRECTUS_URL   = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
    const DIRECTUS_TOKEN = process.env.DIRECTUS_API_TOKEN!;

    const res = await fetch(
      `${DIRECTUS_URL}/items/classes/${id}?fields[]=id,name,discipline,description`,
      {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? null) as Class | null;
  } catch {
    return null;
  }
}

export async function getCourses(): Promise<Class[]> {
  try {
    // Use admin token so all classes are always returned regardless of public-role permissions.
    // next.revalidate keeps the homepage fresh without hammering Directus on every request.
    const DIRECTUS_URL   = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
    const DIRECTUS_TOKEN = process.env.DIRECTUS_API_TOKEN!;

    const res = await fetch(
      `${DIRECTUS_URL}/items/classes?sort[]=name&fields[]=id,name,discipline,description`,
      {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? []) as Class[];
  } catch {
    return [];
  }
}

export default directus;
