import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

/**
 * POST /api/portal/upload
 * Proxies a multipart file upload to Directus /files using the auth cookie.
 * Returns the created Directus file object (including id, filename_download, type).
 *
 * Usage: POST FormData with a "file" field (and optionally a "title" field).
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();

    // Forward the FormData directly to Directus — DO NOT set Content-Type manually,
    // the browser sets it automatically with the correct boundary.
    const res = await fetch(`${DIRECTUS_URL}/files`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // No Content-Type — let fetch derive it from the FormData body
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: err.errors?.[0]?.message || "File upload failed." },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Server error during upload." }, { status: 500 });
  }
}
