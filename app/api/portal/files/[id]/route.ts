import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

/**
 * GET /api/portal/files/[id]
 * Proxy for authenticated Directus file downloads.
 * Reads the auth cookie and forwards the request to Directus /assets/:id.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;
    const res = await fetch(`${DIRECTUS_URL}/assets/${id}?download`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return new NextResponse("File not found", { status: 404 });
    }

    const headers = new Headers();
    const contentType = res.headers.get("Content-Type");
    const contentDisposition = res.headers.get("Content-Disposition");
    if (contentType) headers.set("Content-Type", contentType);
    if (contentDisposition) headers.set("Content-Disposition", contentDisposition);

    return new NextResponse(res.body, { headers });
  } catch {
    return new NextResponse("Server error", { status: 500 });
  }
}
