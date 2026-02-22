import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/portal/logout
 * Clears auth cookies and redirects to the login page.
 * Works as a plain HTML form action (no JS required).
 */
export async function POST(req: NextRequest) {
  // 303 See Other: tells the browser to follow with a GET (not re-POST)
  const response = NextResponse.redirect(new URL("/portal/login", req.url), { status: 303 });
  response.cookies.delete("directus_token");
  response.cookies.delete("directus_refresh");
  response.cookies.delete("portal_role");
  response.cookies.delete("portal_name");
  return response;
}
