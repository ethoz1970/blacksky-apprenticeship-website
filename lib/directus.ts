import { createDirectus, rest, readItems } from '@directus/sdk';

type Class = {
  id: number;
  name: string;
  description: string;
  discipline: 'media' | 'tech' | 'business' | 'arts';
  status: string;
  date_created: string;
};

type Schema = {
  classes: Class[];
};

const directus = createDirectus<Schema>(
  process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://directus-production-21fe.up.railway.app'
).with(rest());

export async function getCourses(): Promise<Class[]> {
  try {
    const items = await directus.request(
      readItems('classes', {
        filter: { status: { _eq: 'published' } },
        sort: ['name'],
      })
    );
    return items as Class[];
  } catch {
    return [];
  }
}

export default directus;
