import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/portal/logout
 * Clears auth cookies and redirects to the login page.
 * Works as a plain HTML form action (no JS required).
 */
export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/portal/login", req.url));
  response.cookies.delete("directus_token");
  response.cookies.delete("directus_refresh");
  response.cookies.delete("portal_role");
  return response;
}
