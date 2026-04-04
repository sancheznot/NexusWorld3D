import { NextResponse } from "next/server";
import { getPublicAuthFlags } from "@/lib/auth/publicAuthFlags";

export async function GET() {
  return NextResponse.json(getPublicAuthFlags());
}
