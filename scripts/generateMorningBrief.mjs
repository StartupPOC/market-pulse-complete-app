import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const rootDir = process.cwd();
const sourcePath = path.join(rootDir, "lib", "morningBriefData.ts");
const outputPath = path.join(rootDir, "data", "currentMorningBriefData.json");

function toIstIso(date = new Date()) {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + istOffsetMs);
  return `${istDate.toISOString().replace("Z", "")}+05:30`;
}

function validateDataPoint(point, pathLabel) {
  if (!point || typeof point !== "object" || Array.isArray(point)) {
    throw new Error(`${pathLabel} must be a data point object.`);
  }

  for (const key of ["value", "status", "source", "asOf"]) {
    if (!(key in point)) {
      throw new Error(`${pathLabel} is missing ${key}.`);
    }
  }

  if (!["verified", "unavailable", "stale"].includes(point.status)) {
    throw new Error(`${pathLabel} has invalid status: ${point.status}`);
  }

  if (point.value === null && point.status === "verified") {
    throw new Error(`${pathLabel} cannot be verified when value is null.`);
  }
}

function walk(value, pathLabel = "morningBriefData") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${pathLabel}[${index}]`));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const keys = Object.keys(value);
  if (keys.includes("value") && keys.includes("status") && keys.includes("source") && keys.includes("asOf")) {
    validateDataPoint(value, pathLabel);
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    walk(child, `${pathLabel}.${key}`);
  }
}

async function loadMockMorningBriefData() {
  const source = await readFile(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  }).outputText;

  const sandbox = {
    exports: {},
    require(specifier) {
      throw new Error(`Unexpected runtime import while generating brief: ${specifier}`);
    }
  };

  vm.runInNewContext(transpiled, sandbox, { filename: sourcePath });
  return sandbox.exports.morningBriefData;
}

async function main() {
  // Replace this loader later with real API/AI prompt logic. The script should
  // still return the same complete JSON shape and mark missing values unavailable.
  const data = await loadMockMorningBriefData();
  const generatedAt = toIstIso();
  const nextData = {
    ...data,
    generatedAt,
    lastRefreshed: generatedAt
  };

  walk(nextData);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(nextData, null, 2)}\n`, "utf8");
  console.log(`Wrote ${path.relative(rootDir, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
