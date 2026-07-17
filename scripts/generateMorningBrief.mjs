import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const rootDir = process.cwd();
const sourcePath = path.join(rootDir, "lib", "morningBriefData.ts");
const outputPath = path.join(rootDir, "data", "currentMorningBriefData.json");
const openAiApiUrl = "https://api.openai.com/v1/responses";
const analystBriefInstructions = `You are an expert Indian equity market analyst and risk-first F&O trader.

Generate a MORNING MARKET BRIEF for Indian markets for today.

IMPORTANT RULES:
1. Do not invent any market data.
2. Search the web for latest verified data before writing.
3. Every market data point must mention source and timestamp/as-of where available.
4. If any data is unavailable, write "Data unavailable" instead of guessing.
5. Do not give fresh stock recommendation unless price action, sector strength, volume, F&O/OI/IV, and event risk are verified.
6. If F&O/OI/IV is not verified, mark all stock names as "Watchlist only".
7. Use Indian market context: NSE, BSE, Nifty, Bank Nifty, Gift Nifty, India VIX, FII/DII, crude, USDINR, US markets, Asian markets, macro events.
8. Keep tone practical, concise, and risk-first.
9. Include Market Mood Index mandatorily.
10. Include Macro Calendar mandatorily.
11. Include Market Drivers mandatorily.
12. Sector Rotation must be a table, not prose.

SOURCE PRIORITY AND AVAILABILITY RULES:
- For Indian index close/previous close, India VIX, market breadth and exchange data, search NSE, BSE, Moneycontrol, TradingView, Economic Times Markets, Business Standard, Reuters, CNBC TV18, Mint, or other reputable market pages.
- For FII/DII cash flow, search NSE/BSE/NSDL/SEBI exchange-provisional data and reputable market summaries.
- For Gift Nifty, search NSE IX/GIFT Nifty, SGX/GIFT Nifty pages, Moneycontrol, TradingView, or reputable live market pages.
- For global cues, search CNBC, Reuters, MarketWatch, Investing.com, TradingView, Yahoo Finance, official index/commodity pages, or reputable financial news.
- For macro calendar, search official India/government/RBI sources, US economic calendar sources, investing/economic calendar sources, and major earnings calendars.
- If live intraday data is unavailable but latest previous close is available, use latest previous close and mark status "verified" when the source/as-of are clear; mark "stale" only if the data is older than the latest completed trading session.
- If exact F&O/OI/IV details are not available from a reliable source, do not invent them. Mark stock ideas "Watchlist only" and options fields unavailable where needed.
- Derived analytical fields such as market bias, mood score, confidence score, sector rotation score, trading plan, and risk list may be generated from verified inputs. Use source "MarketPulse analysis based on verified inputs" and asOf current generation timestamp for those derived fields.
- Do not leave analytical fields unavailable if enough verified inputs exist to form a cautious risk-first view.

TRADING PROFILE:
- Total trading capital: ₹30 lakh
- Swing capital: ₹25 lakh
- Options capital: ₹5 lakh
- Style: Swing + BTST + F&O
- Target return: 5-10%
- Avoid: operator-driven stocks, low liquidity stocks, penny stocks
- Options rule: no averaging unless strongly verified; avoid far OTM CE/PE in volatile market

OUTPUT CONTENT TO RESEARCH:

1. Market Bias
- Bullish
- Mildly bullish
- Neutral
- Cautious
- Bearish
Explain why in 3-5 lines.

2. Market Snapshot
Include Nifty previous close, Sensex previous close, Bank Nifty previous close, Gift Nifty, India VIX, Brent crude, USDINR, FII cash flow, DII cash flow.
Each row must include value, change if available, source, as-of timestamp.

3. Market Mood Index
Give score from 0-100:
0-25 Extreme Fear
26-45 Fear
46-55 Neutral
56-75 Greed
76-100 Extreme Greed
Factors must include Gift Nifty, previous day Nifty movement, FII/DII flows, crude oil, US markets, Asian markets, India VIX, major macro/event risk.

4. Market Drivers
Include crude oil, US market overnight, Asian market cues, Rupee/Dollar, FII/DII flow, earnings/events, geopolitical/macro news.

5. Global Cues
Include US indices, Asian indices, crude, gold, dollar index, US 10Y yield.

6. Sector Rotation
Use table only.
Columns: Rank | Sector | Rotation Status | Reason | Stocks to Watch | Risk.
Only include 6-8 important sectors.
Classify as Strongest, Strong, Improving, Neutral, Weakening, Weakest.
Must compare macro fit:
- IT vs rupee/Nasdaq
- Banks vs FII/yields/CPI
- Realty vs interest-rate expectations
- Pharma as defensive
- Oil-sensitive sectors vs crude
- Defence/capital goods as momentum themes

7. Nifty and Bank Nifty Levels
Give support/resistance.
Do not invent levels if unavailable from credible technical source. If using analyst judgement, clearly mark "Analyst estimate".

8. F&O Watchlist
Only include F&O stocks if F&O eligibility is verified.
For each: Stock | Bias | Why | Entry condition | Stop loss | Target | Status.
Status must be Qualified, Watchlist only, or Avoid.
Do not mark Qualified unless OI/IV and sector strength are verified.

9. Swing Watchlist
Stock | Sector | Why watch | Entry condition | SL | Target | Status.
Only give "Watchlist only" unless EOD close, volume and sector strength are verified.

10. Stocks / Sectors to Avoid
Include far OTM options if volatility is high, crude-sensitive sectors if crude is rising, result-event stocks if IV crush risk exists, overextended gap-up stocks.

11. Macro Calendar
Include India and global events: CPI/WPI if relevant, RBI/Fed events, US CPI/jobs data, major earnings, crude inventory/geopolitical events.

12. Current Holdings Risk Check
If current holdings are not provided, write: "No current holdings provided."

13. Final Trading Plan
Give scenario-based plan:
- If market opens gap up
- If market opens flat
- If market opens gap down
- If Nifty breaks support
- If Nifty sustains above resistance
End with best sector for today, highest-risk sector today, fresh trade allowed or not, final one-line verdict.

STRICT DISCLAIMERS:
- This is educational market analysis, not investment advice.
- Do not recommend trades without verified data.`;

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
  return `${analystBriefInstructions}

Research today's Indian market morning brief inputs for ${generatedAt} Asia/Kolkata.

Return concise source-grounded research notes. Markdown tables are okay in this research step.
Do not invent data. Use "Data unavailable" where sources are not verified.
Before marking any displayed field unavailable, try the source categories listed in SOURCE PRIORITY AND AVAILABILITY RULES.
For each required webpage field, include either:
- verified value/change/source/as-of, or
- "Data unavailable" plus a short reason why it could not be verified.

Current webpage requires these displayed fields:
- Nifty 50, Bank Nifty, GIFT Nifty, India VIX
- US markets, Asian markets, Brent crude, USD index, Gold spot
- FII net, DII net
- Market Mood Index score and label
- Confidence score out of 10 and label
- 6-8 sector rotation rows with sector, status, reasons, beneficiary/watchlist stocks, risk
- Swing watchlist and BTST/F&O watchlist; mark "Watchlist only" unless fully verified
- Nifty resistance/support levels; use analyst estimate only if clearly marked
- Options setup: PCR, max pain, max call OI, max put OI, fresh long build-up, fresh short build-up
- Macro calendar
- Key risks and scenario trading plan

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

Use these analyst instructions as the business requirements for the content:
${analystBriefInstructions}

Critical rules:
- Return ONLY valid JSON. No markdown.
- Match the exact object structure shown in the template shape.
- Every DataPoint object must contain: value, change, changePercent, status, source, asOf.
- status must be one of: verified, unavailable, stale.
- Never invent market data, levels, flows, OI, sector rankings, or stock ideas.
- If a value is not verified from raw data or web-search evidence, use value: null, change: null, changePercent: null, status: "unavailable".
- For every field used by the webpage, return a DataPoint object in this format:
  {
    "value": actual_value_or_null,
    "change": numeric_change_or_null,
    "changePercent": numeric_change_percent_or_null,
    "status": "verified" | "stale" | "unavailable",
    "source": "source name or Data unavailable",
    "asOf": "ISO timestamp or current generation timestamp"
  }
- If data is missing, unverified, paywalled, conflicting, or too stale, set value: null, change: null, changePercent: null, status: "unavailable", source: "Data unavailable", asOf: current generation timestamp.
- For watchlists, use "Watchlist only" in relevant text fields when verification is incomplete. Do not mark any idea as qualified unless price action, sector strength, volume, OI/IV, and event risk are verified.
- Use latest previous close if live data is unavailable but the latest completed-session value is verified.
- Derived analytical fields may be generated from verified inputs. For derived fields, set source to "MarketPulse analysis based on verified inputs" and asOf to current generation timestamp.
- Do not mark page.summary, page.bias, moodIndex.score, moodIndex.label, confidence.score, confidence.label, keyRisks, or tradingPlan unavailable when enough verified market inputs exist to form a cautious analysis.
- Use concise source names and ISO asOf timestamps.
- Keep moodIndex.ranges exactly as shown.
- Keep footer CTA/disclaimer stable.
- Sector rows should include only sectors with enough evidence; otherwise return an empty array or unavailable DataPoints.
- This is educational market intelligence, not investment advice.

Map the analyst brief into the webpage JSON like this:
- Market Bias -> page.bias and page.summary.
- Market Mood Index -> moodIndex.score, moodIndex.label, and confidence score/label.
- Market Snapshot -> marketSnapshot; Sensex and USDINR are researched but not displayed on the current page.
- Global Cues -> globalCues; include US markets, Asian markets, Brent crude, USD index, Gold. US 10Y is researched but not displayed on the current page.
- FII/DII -> fiiDii.
- Sector Rotation -> sectors. Convert rotation status to statusVsPrevious. Convert stocks to watch to beneficiaries. Use bestFnoPick only when verified; otherwise "Watchlist only".
- Nifty/Bank Nifty Levels -> indexLevels. The current page displays Nifty levels only; prioritize Nifty.
- F&O Watchlist -> btstIdeas only when entry/SL/target are verified; otherwise use "Watchlist only" strings and unavailable status where needed.
- Swing Watchlist -> swingOpportunities.
- Options/OI data -> optionsSetup. If PCR, max pain, max call OI, max put OI, fresh long build-up, or fresh short build-up are not verified, mark unavailable.
- Macro Calendar -> macroCalendar.
- Stocks/Sectors to Avoid, Market Drivers, event risks -> keyRisks and tradingPlan.
- Current holdings risk check is not displayed on the current page; ignore unless it affects keyRisks.

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
