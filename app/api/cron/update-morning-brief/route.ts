import { NextRequest, NextResponse } from "next/server";
import { fetchLatestMorningBriefData, writeMorningBriefData } from "@/lib/morningBriefStore";
import type { MorningBriefData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) return false;

  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
  const headerToken = request.headers.get("x-cron-secret");

  return bearerToken === configuredSecret || headerToken === configuredSecret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null) as Partial<{ data: MorningBriefData }> | MorningBriefData | null;
    const candidateData = body && "data" in body ? body.data : body;
    const latestData = candidateData ?? await fetchLatestMorningBriefData();
    const savedData = await writeMorningBriefData(latestData as MorningBriefData);

    return NextResponse.json({
      ok: true,
      lastRefreshed: savedData.lastRefreshed,
      generatedAt: savedData.generatedAt
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update morning brief"
    }, { status: 500 });
  }
}
