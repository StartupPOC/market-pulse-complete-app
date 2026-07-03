import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getValidatedMorningBriefData } from "./dataValidation";
import { morningBriefData } from "./morningBriefData";
import type { MorningBriefData } from "./types";

const storePath = path.join(process.cwd(), "data", "currentMorningBriefData.json");

export async function readMorningBriefData(): Promise<MorningBriefData> {
  try {
    const file = await readFile(storePath, "utf8");
    return getValidatedMorningBriefData(JSON.parse(file) as MorningBriefData);
  } catch {
    return getValidatedMorningBriefData(morningBriefData);
  }
}

export async function writeMorningBriefData(data: MorningBriefData): Promise<MorningBriefData> {
  const validated = getValidatedMorningBriefData(data);
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  return validated;
}

export async function fetchLatestMorningBriefData(): Promise<MorningBriefData> {
  // Plug real market APIs or AI-generated data here. For now, this returns the
  // current mock shape without inventing unavailable values.
  return getValidatedMorningBriefData(morningBriefData);
}
