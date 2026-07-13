import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const rootDir = process.cwd();
const sourcePath = path.join(rootDir, "lib", "morningBriefData.ts");
const outputPath = path.join(rootDir, "data", "currentMorningBriefData.json");
const openAiApiUrl = "https://api.openai.com/v1/responses";

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

async function loadRawMarketData() {
  if (process.env.RAW_MARKET_DATA_JSON) {
    return JSON.parse(process.env.RAW_MARKET_DATA_JSON);
  }

  if (process.env.RAW_MARKET_DATA_URL) {
    const response = await fetch(process.env.RAW_MARKET_DATA_URL, {
      headers: process.env.RAW_MARKET_DATA_TOKEN
        ? { Authorization: `Bearer ${process.env.RAW_MARKET_DATA_TOKEN}` }
        : undefined
    });

    if (!response.ok) {
      throw new Error(`RAW_MARKET_DATA_URL failed: ${response.status} ${await response.text()}`);
    }

    return response.json();
  }

  return {
    note: "No external raw market data source configured. Use web search if enabled. Mark unverified values unavailable.",
    requiredPolicy: "Never invent data. If a value cannot be verified from accessible sources, set value to null and status to unavailable."
  };
}

function extractOutputText(responseJson) {
  if (typeof responseJson.output_text === "string") {
    return responseJson.output_text;
  }

  const chunks = [];
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (typeof value.text === "string") chunks.push(value.text);
    if (Array.isArray(value)) value.forEach(visit);
    else Object.values(value).forEach(visit);
  };

  visit(responseJson.output);
  return chunks.join("\n").trim();
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("OpenAI response did not contain JSON.");
    return JSON.parse(match[0]);
  }
}

async function callOpenAI({ apiKey, body }) {
  const response = await fetch(openAiApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI API failed: ${response.status} ${responseText}`);
  }

  return JSON.parse(responseText);
}

function researchPrompt({ rawMarketData, generatedAt }) {
  return `Research today's Indian market morning brief inputs for ${generatedAt} Asia/Kolkata.

Find concise, source-grounded notes for:
- Nifty 50, Bank Nifty, GIFT Nifty, India VIX
- US markets, Asian markets, Brent crude, USD index, gold spot
- FII net and DII net
- Nifty support/resistance, trend, bias
- options setup: PCR, max pain, max call OI, max put OI, fresh long/short build-up
- relevant sector rotation candidates, top beneficiary stocks, risks, macro calendar

Rules:
- Do not invent numbers.
- If you cannot verify something, say "unavailable".
- Prefer official exchange/source data when accessible.
- Keep notes concise and include source names and as-of timing where available.

Raw market data supplied by caller:
${JSON.stringify(rawMarketData, null, 2)}
`;
}

function briefPrompt({ rawMarketData, template, generatedAt }) {
  const shape = {
    generatedAt: "ISO timestamp",
    lastRefreshed: "ISO timestamp",
    page: template.page,
    moodIndex: template.moodIndex,
    marketSnapshot: template.marketSnapshot,
    globalCues: template.globalCues,
    fiiDii: template.fiiDii,
    confidence: template.confidence,
    sectors: template.sectors.slice(0, 2),
    swingOpportunities: template.swingOpportunities.slice(0, 2),
    btstIdeas: template.btstIdeas.slice(0, 1),
    indexLevels: template.indexLevels,
    optionsSetup: template.optionsSetup,
    macroCalendar: template.macroCalendar.slice(0, 1),
    keyRisks: template.keyRisks,
    tradingPlan: template.tradingPlan,
    footer: template.footer
  };

  return `Generate today's Indian market Morning Market Brief JSON for the MarketPulse dashboard.

Current generation timestamp: ${generatedAt}
Timezone: Asia/Kolkata

Critical rules:
- Return ONLY valid JSON. No markdown.
- Match the exact object structure shown in the template shape.
- Every DataPoint object must contain: value, change, changePercent, status, source, asOf.
- status must be one of: verified, unavailable, stale.
- Never invent market data, levels, flows, OI, sector rankings, or stock ideas.
- If a value is not verified from raw data or web-search evidence, use value: null, change: null, changePercent: null, status: "unavailable".
- Use concise source names and ISO asOf timestamps.
- Keep moodIndex.ranges exactly as shown.
- Keep footer CTA/disclaimer stable.
- Sector rows should include only sectors with enough evidence; otherwise return an empty array or unavailable DataPoints.
- This is educational market intelligence, not investment advice.

Template shape with example values. Use this for structure only; do not copy old market values unless independently verified:
${JSON.stringify(shape, null, 2)}

Raw market data available to you:
${JSON.stringify(rawMarketData, null, 2)}
`;
}

async function generateWithOpenAI({ rawMarketData, template, generatedAt }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY is not set. Falling back to mock data.");
    return null;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const useWebSearch = process.env.OPENAI_ENABLE_WEB_SEARCH === "true";
  let researchedNotes = "";

  if (useWebSearch) {
    console.log("Researching market data with OpenAI web search...");
    const researchResponse = await callOpenAI({
      apiKey,
      body: {
        model,
        input: [
          {
            role: "system",
            content: "You research market data carefully. Summarize findings with source names and mark unverified data unavailable."
          },
          {
            role: "user",
            content: researchPrompt({ rawMarketData, generatedAt })
          }
        ],
        tools: [{ type: "web_search_preview" }]
      }
    });
    researchedNotes = extractOutputText(researchResponse);
  }

  console.log("Generating strict morningBriefData JSON...");
  const requestBody = {
    model,
    input: [
      {
        role: "system",
        content: "You produce strict JSON for a financial dashboard. You verify data, avoid fabrication, and mark missing data unavailable."
      },
      {
        role: "user",
        content: briefPrompt({
          rawMarketData: {
            suppliedRawData: rawMarketData,
            researchedNotes: researchedNotes || "No web-search notes available."
          },
          template,
          generatedAt
        })
      }
    ],
    tools: [],
    text: {
      format: {
        type: "json_object"
      }
    }
  };

  const parsedResponse = await callOpenAI({ apiKey, body: requestBody });
  return extractJson(extractOutputText(parsedResponse));
}

async function main() {
  const generatedAt = toIstIso();
  const template = await loadMockMorningBriefData();
  const rawMarketData = await loadRawMarketData();
  const generated = await generateWithOpenAI({ rawMarketData, template, generatedAt });
  const data = generated ?? template;
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
