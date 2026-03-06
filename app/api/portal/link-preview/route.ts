import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Blackskybot/1.0 (+https://blackskyup.com)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json({ error: "Could not fetch URL" }, { status: 400 });

    const html = await res.text();

    function og(prop: string) {
      const m = html.match(new RegExp(`<meta[^>]*property=["']og:${prop}["'][^>]*content=["']([^"']+)["']`, "i"))
        ?? html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${prop}["']`, "i"));
      return m?.[1] ?? null;
    }
    function meta(name: string) {
      const m = html.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, "i"))
        ?? html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["']`, "i"));
      return m?.[1] ?? null;
    }
    function title() {
      return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
    }

    return NextResponse.json({
      title:       og("title") ?? meta("title") ?? title(),
      description: og("description") ?? meta("description"),
      image:       og("image"),
      url,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch preview" }, { status: 500 });
  }
}
