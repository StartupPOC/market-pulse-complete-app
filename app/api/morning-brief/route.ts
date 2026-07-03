import { NextResponse } from "next/server";
import { readMorningBriefData } from "@/lib/morningBriefStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await readMorningBriefData();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
