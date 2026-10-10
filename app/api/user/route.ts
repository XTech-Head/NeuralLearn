// app/api/user/route.ts
import { NextResponse } from "next/server";
import { getAuthedDbUser } from "@/lib/server-auth"; // wherever the helper lives

export async function POST() {
  const { user, error, status } = await getAuthedDbUser();
  if (!user) return NextResponse.json({ error }, { status });
  return NextResponse.json(user);
}