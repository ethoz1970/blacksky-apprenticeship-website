import { NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const DIRECTUS_TOKEN = process.env.DIRECTUS_API_TOKEN!;

/**
 * GET /api/courses
 * Public endpoint — returns all classes for the apply form dropdown.
 */
export async function GET() {
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/classes?sort[]=name&fields[]=id,name,discipline`,
      {
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` },
        next: { revalidate: 120 },
      }
    );
    if (!res.ok) return NextResponse.json({ data: [] });
    const json = await res.json();
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ data: [] });
  }
}
