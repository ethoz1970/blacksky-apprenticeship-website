import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { action } = await req.json(); // "accept" | "decline"

  const status = action === "accept" ? "accepted" : "declined";
  const res = await fetch(`${DIRECTUS_URL}/items/user_connections/${id}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) return NextResponse.json({ error: "Failed to update connection" }, { status: res.status });
  const json = await res.json();
  return NextResponse.json({ data: json.data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("directus_token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const res = await fetch(`${DIRECTUS_URL}/items/user_connections/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 204 || res.ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ error: "Failed to delete connection" }, { status: res.status });
}
