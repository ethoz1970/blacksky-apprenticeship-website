import { createDirectus, rest, readItems } from '@directus/sdk';

export type Class = {
  id: number;
  name: string;
  description: string;
  discipline: 'media' | 'tech' | 'business' | 'arts';
  /** M2O — assigned teacher (any Directus user) */
  teacher?: { id: string; first_name: string; last_name: string } | null;
  /** O2M — enrolled (approved) students whose class_id = this class */
  students?: { id: string; first_name: string; last_name: string }[];
  /** O2M — pending applications whose selected_class = this class */
  pending_applicants?: { id: number; name: string; status: string }[];
};

type Schema = {
  classes: Class[];
};

const directus = createDirectus<Schema>(
  process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://directus-production-21fe.up.railway.app'
).with(rest());

export async function getCourses(): Promise<Class[]> {
  try {
    // Note: the classes collection has no status field — all classes are returned
    const items = await directus.request(
      readItems('classes', {
        sort: ['name'],
      })
    );
    return items as Class[];
  } catch {
    return [];
  }
}

export default directus;
