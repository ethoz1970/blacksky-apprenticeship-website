import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

/**
 * GET /api/portal/files/[id]
 * Proxy for authenticated Directus file access.
 *
 * ?inline=1  → serves the file inline (browser renders PDFs, images, etc.)
 * (default)  → forces download via Content-Disposition: attachment
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
    const inline = req.nextUrl.searchParams.get("inline") === "1";

    // ?download forces Directus to set Content-Disposition: attachment
    const directusUrl = inline
      ? `${DIRECTUS_URL}/assets/${id}`
      : `${DIRECTUS_URL}/assets/${id}?download`;

    const res = await fetch(directusUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return new NextResponse("File not found", { status: 404 });
    }

    const headers = new Headers();
    const contentType = res.headers.get("Content-Type") ?? "application/octet-stream";
    headers.set("Content-Type", contentType);

    if (inline) {
      // Let the browser decide how to display it
      headers.set("Content-Disposition", "inline");
    } else {
      // Force download — use Directus header if present, otherwise set attachment
      const cd = res.headers.get("Content-Disposition");
      headers.set("Content-Disposition", cd ?? "attachment");
    }

    return new NextResponse(res.body, { headers });
  } catch {
    return new NextResponse("Server error", { status: 500 });
  }
}
