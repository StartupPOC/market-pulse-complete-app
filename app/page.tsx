import { MorningBriefClient } from "@/components/MorningBriefClient";
import { readMorningBriefData } from "@/lib/morningBriefStore";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await readMorningBriefData();
  return <MorningBriefClient initialData={data} />;
}
