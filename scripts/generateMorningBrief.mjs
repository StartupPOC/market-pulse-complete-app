import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const rootDir = process.cwd();
const sourcePath = path.join(rootDir, "lib", "morningBriefData.ts");
const outputPath = path.join(rootDir, "data", "currentMorningBriefData.json");
const defaultPayloadPath = path.join(rootDir, "data", "morning_market_payload_v2.json");
const openAiApiUrl = "https://api.openai.com/v1/responses";
const openAiMaxAttempts = Number(process.env.OPENAI_MAX_ATTEMPTS || 3);
const openAiRetryDelayMs = Number(process.env.OPENAI_RETRY_DELAY_MS || 15000);
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

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadExistingMorningBriefData() {
  try {
    return JSON.parse(await readFile(outputPath, "utf8"));
  } catch {
    return null;
  }
}

async function loadOpenAiPayload() {
  if (process.env.OPENAI_PAYLOAD_JSON) {
    return JSON.parse(process.env.OPENAI_PAYLOAD_JSON);
  }

  const configuredPath = process.env.OPENAI_PAYLOAD_FILE
    ? path.resolve(rootDir, process.env.OPENAI_PAYLOAD_FILE)
    : defaultPayloadPath;

  if (!(await fileExists(configuredPath))) {
    return null;
  }

  return JSON.parse(await readFile(configuredPath, "utf8"));
}

async function callOpenAI({ apiKey, body }) {
  let lastError;

  for (let attempt = 1; attempt <= openAiMaxAttempts; attempt += 1) {
    try {
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
    } catch (error) {
      lastError = error;
      if (attempt === openAiMaxAttempts) break;
      console.warn(`OpenAI request failed on attempt ${attempt}/${openAiMaxAttempts}. Retrying in ${Math.round(openAiRetryDelayMs / 1000)}s...`);
      await new Promise((resolve) => setTimeout(resolve, openAiRetryDelayMs));
    }
  }

  throw lastError;
}

function runtimeInstruction(generatedAt) {
  return `\n\nRUNTIME CONTEXT:\n- Current run timestamp: ${generatedAt}\n- Timezone: Asia/Kolkata\n- Generate the brief for the current Indian market date implied by this timestamp.\n- metadata.date, metadata.day, preparedTimeIST, dataCutoffTimeIST, and every displayed date must reflect the latest verified market data found for this run.\n- Do not reuse old dates from examples or previous stored JSON.\n- If latest available market data is from an earlier trading session, state that exact data date in metadata.dataQualityNote and dataGaps.`;
}

function applyPayloadRuntimeOverrides(payload, generatedAt) {
  const nextPayload = structuredClone(payload);

  if (process.env.OPENAI_MODEL) {
    nextPayload.model = process.env.OPENAI_MODEL;
  }

  if (process.env.OPENAI_MAX_OUTPUT_TOKENS) {
    nextPayload.max_output_tokens = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS);
  }

  if (process.env.OPENAI_SEARCH_CONTEXT_SIZE && Array.isArray(nextPayload.tools)) {
    nextPayload.tools = nextPayload.tools.map((tool) => (
      tool?.type === "web_search" || tool?.type === "web_search_preview"
        ? { ...tool, search_context_size: process.env.OPENAI_SEARCH_CONTEXT_SIZE }
        : tool
    ));
  }

  if (Array.isArray(nextPayload.input)) {
    const userMessage = nextPayload.input.find((item) => item?.role === "user" && Array.isArray(item.content));
    const textBlock = userMessage?.content?.find((block) => typeof block?.text === "string");
    if (textBlock && !textBlock.text.includes("RUNTIME CONTEXT:")) {
      textBlock.text += runtimeInstruction(generatedAt);
    }
  }

  return nextPayload;
}

function normalizeText(value, fallback = "Data unavailable") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function isUnavailable(value) {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value) || typeof value === "object") return false;
  return /data unavailable|unavailable|not available|n\/a|na|null|undefined/i.test(normalizeText(value, ""));
}

function normalizeStatus(value, status) {
  if (isUnavailable(value) || status === "unavailable") return "unavailable";
  if (status === "stale") return "stale";
  return "verified";
}

function parseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null || value === undefined || isUnavailable(value)) return null;
  const text = String(value).replace(/,/g, "");
  const match = text.match(/[-+]?\d*\.?\d+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercent(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null || value === undefined || isUnavailable(value)) return null;
  const match = String(value).match(/[-+]?\d*\.?\d+(?=\s*%)/);
  return match ? Number(match[0]) : null;
}

function signedNumber(value) {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  return /^\s*-/.test(String(value)) ? -Math.abs(parsed) : parsed;
}

function normalizeAsOf(value, fallback) {
  if (!value || isUnavailable(value)) return fallback;
  const text = String(value).trim();
  const parsed = parseIstDate(text);
  return parsed || text;
}

function dp(value, source, asOf, extra = {}) {
  const status = normalizeStatus(value, extra.status);
  return {
    value: status === "unavailable" ? null : value,
    change: extra.change ?? null,
    changePercent: extra.changePercent ?? null,
    status,
    source: status === "unavailable" ? "Data unavailable" : normalizeText(source, "MarketPulse analysis"),
    asOf,
    ...extra,
    status
  };
}

function parseIstDate(value) {
  if (!value) return null;
  const text = String(value).replace(/\bIST\b/i, "").trim();
  const parsedDirect = new Date(text);
  if (!Number.isNaN(parsedDirect.getTime())) return parsedDirect.toISOString();

  const match = text.match(/(\d{4})-(\d{2})-(\d{2})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  const [, year, month, day, hour = "08", minute = "00", second = "00"] = match;
  return `${year}-${month}-${day}T${hour.padStart(2, "0")}:${minute}:${second}+05:30`;
}

function sourceTimestamp(metadata, fallback) {
  return parseIstDate(metadata?.preparedTimeIST) || parseIstDate(metadata?.dataCutoffTimeIST) || parseIstDate(metadata?.date) || fallback;
}

function formatDateLabel(metadata, fallbackTimestamp) {
  const source = parseIstDate(metadata?.dataCutoffTimeIST)
    || parseIstDate(metadata?.preparedTimeIST)
    || parseIstDate(metadata?.date)
    || fallbackTimestamp;
  const date = new Date(source);
  if (Number.isNaN(date.getTime())) {
    return normalizeText(metadata?.date, "Date unavailable").toUpperCase();
  }

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata"
  }).format(date).replace(",", ",").toUpperCase();
}

function findByName(rows, names) {
  const patterns = names.map((name) => new RegExp(name, "i"));
  return rows.find((row) => patterns.some((pattern) => pattern.test(normalizeText(row.name || row.asset || row.index || row.market, ""))));
}

function splitList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (!item || typeof item !== "object") return normalizeText(item, "");
      const fields = [item.stock, item.name, item.sector, item.reason, item.status]
        .map((part) => normalizeText(part, ""))
        .filter((part) => part && !isUnavailable(part));
      return fields.join(" - ");
    }).filter(Boolean);
  }
  if (value && typeof value === "object") {
    return splitList([value]);
  }
  if (!value || isUnavailable(value)) return [];
  return String(value).split(/[,\n;|]+| · /).map((item) => item.trim()).filter(Boolean);
}

function toneFrom(change, text = "") {
  const parsed = signedNumber(change);
  if (parsed !== null) return parsed < 0 ? "negative" : parsed > 0 ? "positive" : "neutral";
  if (/negative|weak|fall|down|red|pressure/i.test(text)) return "negative";
  if (/positive|strong|rise|up|green|support/i.test(text)) return "positive";
  return "neutral";
}

function importanceScore(value) {
  const text = normalizeText(value, "").toLowerCase();
  if (text.includes("high")) return 5;
  if (text.includes("medium")) return 3;
  if (text.includes("low")) return 1;
  return parseNumber(value) ?? 3;
}

function parseBias(label, score) {
  const text = normalizeText(label, "");
  if (/bear|fear|weak/i.test(text)) return "Bearish";
  if (/bull|greed|strong/i.test(text)) return "Bullish";
  const numericScore = parseNumber(score);
  if (numericScore !== null) {
    if (numericScore >= 56) return "Bullish";
    if (numericScore <= 45) return "Bearish";
  }
  return "Neutral";
}

function moodZoneLabel(score) {
  const value = parseNumber(score);
  if (value === null) return "Neutral";
  if (value <= 25) return "Extreme Fear";
  if (value <= 45) return "Fear";
  if (value <= 55) return "Neutral";
  if (value <= 75) return "Greed";
  return "Extreme Greed";
}

function firstLevel(levels, pattern, index = 0) {
  const matches = (levels || []).filter((item) => pattern.test(normalizeText(item.levelType || item.type || item.name, "")));
  return matches[index] || null;
}

function levelValue(level) {
  return parseNumber(level?.level ?? level?.value ?? level?.price);
}

function isAvailablePoint(point) {
  return Boolean(point && point.status !== "unavailable" && point.value !== null && point.value !== undefined);
}

function countAvailablePoints(points) {
  return points.filter(isAvailablePoint).length;
}

function hasUsefulRows(rows, pickPoint, minimum) {
  return Array.isArray(rows) && rows.filter((row) => isAvailablePoint(pickPoint(row))).length >= minimum;
}

function validateGeneratedBriefQuality(data) {
  const availableSnapshotCount = countAvailablePoints([
    data.marketSnapshot?.nifty,
    data.marketSnapshot?.bankNifty,
    data.marketSnapshot?.giftNifty,
    data.marketSnapshot?.indiaVix
  ]);
  const availableGlobalCueCount = (data.globalCues || []).filter((cue) => isAvailablePoint(cue.metric)).length;
  const hasFlows = isAvailablePoint(data.fiiDii?.fiiNet) || isAvailablePoint(data.fiiDii?.diiNet);
  const hasSectors = hasUsefulRows(data.sectors, (sector) => sector.moneyFlowScore, 3);
  const hasIdeas = hasUsefulRows(data.swingOpportunities, (item) => item.stock, 3)
    || hasUsefulRows(data.btstIdeas, (item) => item.stock, 3);
  const hasLevels = countAvailablePoints([
    data.indexLevels?.resistance1,
    data.indexLevels?.support1
  ]) >= 2;

  const failures = [];
  if (availableSnapshotCount < 2) failures.push(`only ${availableSnapshotCount}/4 market snapshot values available`);
  if (availableGlobalCueCount < 2) failures.push(`only ${availableGlobalCueCount} global cues available`);
  if (!hasFlows) failures.push("FII/DII flow unavailable");
  if (!hasSectors) failures.push("sector rotation is empty or too sparse");
  if (!hasIdeas) failures.push("watchlists are empty or too sparse");
  if (!hasLevels) failures.push("index support/resistance levels are too sparse");

  return {
    ok: failures.length === 0,
    failures
  };
}

function convertOpenAiPayloadResult(result, template, fallbackGeneratedAt) {
  const cards = result.webpage_cards || result.webpageCards || {};
  const metadata = result.metadata || {};
  const generatedAt = sourceTimestamp(metadata, fallbackGeneratedAt);
  const asOf = generatedAt;
  const analysisSource = "MarketPulse analysis based on verified inputs";
  const snapshot = cards.marketSnapshot || [];
  const keyAssets = cards.keyAssets || [];
  const flows = (cards.institutionalFlows || [])[0] || {};
  const mood = cards.marketMood || {};
  const globalConclusion = cards.globalConclusion || {};
  const niftyLevels = cards.indexLevels?.nifty || [];
  const optionsNifty = cards.optionsSetup?.nifty || {};

  const snapshotPoint = (names, sourceFallback = "Market data") => {
    const row = findByName(snapshot, names);
    const value = parseNumber(row?.value);
    return dp(value, row?.source || sourceFallback, normalizeAsOf(row?.asOf, asOf), {
      change: signedNumber(row?.change),
      changePercent: parsePercent(row?.changePercent),
      status: row?.status
    });
  };

  const giftValue = parseNumber(cards.giftNifty?.currentValue);
  const moodScore = parseNumber(mood.score) ?? null;
  const moodLabel = normalizeText(mood.label, "Neutral");
  const moodZone = moodZoneLabel(moodScore);
  const pageSummary = normalizeText(globalConclusion.conclusion, normalizeText((globalConclusion.points || [])[0], "Market data is being prepared."));

  const cueFromAsset = (name, labels) => {
    const asset = findByName(keyAssets, labels);
    const value = parseNumber(asset?.latestReading);
    const changePercent = parsePercent(asset?.change);
    const displayValue = value === null ? "Unavailable" : normalizeText(asset.latestReading);
    const changeLabel = changePercent === null ? normalizeText(asset?.change, "Unavailable") : `${changePercent > 0 ? "+" : ""}${changePercent}%`;
    return {
      name,
      displayValue,
      changeLabel,
      tone: toneFrom(asset?.change, `${asset?.signalForIndia || ""} ${asset?.change || ""}`),
      metric: dp(value ?? displayValue, asset?.source, normalizeAsOf(asset?.asOf, asOf), {
        change: signedNumber(asset?.change),
        changePercent
      })
    };
  };

  const usText = (cards.usMarkets || []).map((item) => `${item.index}: ${item.change || item.close || "Unavailable"}`).join("; ");
  const asiaText = (cards.asianMarkets || []).map((item) => `${item.market}: ${item.latestLevelChange || item.status || "Unavailable"}`).join("; ");
  const usTone = toneFrom(null, `${usText} ${cards.usMarkets?.[0]?.indiaImpact || ""}`);
  const asiaTone = toneFrom(null, `${asiaText} ${cards.asianMarkets?.[0]?.indiaImplication || ""}`);

  const fiiValue = signedNumber(flows.fiiFpiNetActivity);
  const diiValue = signedNumber(flows.diiNetActivity);

  return {
    ...template,
    generatedAt,
    lastRefreshed: fallbackGeneratedAt,
    page: {
      dateLabel: dp(formatDateLabel(metadata, asOf), analysisSource, asOf),
      title: dp("Morning Market Brief", analysisSource, asOf),
      summary: dp(pageSummary, analysisSource, asOf),
      bias: dp(parseBias(moodLabel, moodScore), analysisSource, asOf),
      timestamp: dp(normalizeText(metadata.dataCutoffTimeIST || metadata.preparedTimeIST, `Data cut: ${asOf}`), analysisSource, asOf)
    },
    moodIndex: {
      score: dp(moodScore, analysisSource, asOf),
      label: dp(moodZone, analysisSource, asOf),
      ranges: template.moodIndex.ranges
    },
    marketSnapshot: {
      nifty: snapshotPoint(["nifty previous close", "nifty 50", "^nifty$"], "NSE"),
      bankNifty: snapshotPoint(["bank nifty"], "NSE"),
      giftNifty: dp(giftValue, cards.giftNifty?.source || "GIFT Nifty", normalizeAsOf(cards.giftNifty?.timestamp, asOf), {
        change: signedNumber(cards.giftNifty?.impliedGap),
        changePercent: parsePercent(cards.giftNifty?.impliedGap)
      }),
      indiaVix: snapshotPoint(["india vix", "vix"], "NSE")
    },
    globalCues: [
      {
        name: "US Markets",
        displayValue: usTone === "negative" ? "Negative" : usTone === "positive" ? "Positive" : "Neutral",
        changeLabel: normalizeText(cards.usMarkets?.[0]?.indiaImpact, usTone === "neutral" ? "Neutral" : usTone === "positive" ? "Positive" : "Negative"),
        tone: usTone,
        metric: dp(usText || null, cards.usMarkets?.[0]?.source, asOf)
      },
      {
        name: "Asian Markets",
        displayValue: asiaTone === "negative" ? "Negative" : asiaTone === "positive" ? "Positive" : "Neutral",
        changeLabel: normalizeText(cards.asianMarkets?.[0]?.indiaImplication, asiaTone === "neutral" ? "Neutral" : asiaTone === "positive" ? "Positive" : "Negative"),
        tone: asiaTone,
        metric: dp(asiaText || null, cards.asianMarkets?.[0]?.source, asOf)
      },
      cueFromAsset("Brent Crude", ["brent", "crude"]),
      cueFromAsset("USD Index", ["dxy", "dollar index", "usd index"]),
      cueFromAsset("Gold (Spot)", ["gold"])
    ],
    fiiDii: {
      fiiNet: dp(fiiValue, flows.source, normalizeAsOf(flows.date, asOf), { change: fiiValue }),
      diiNet: dp(diiValue, flows.source, normalizeAsOf(flows.date, asOf), { change: diiValue }),
      interpretation: dp(normalizeText(flows.combinedInterpretation, "Institutional flow data unavailable."), flows.source || analysisSource, normalizeAsOf(flows.date, asOf))
    },
    confidence: {
      score: dp(moodScore === null ? null : Math.round((moodScore / 10) * 10) / 10, analysisSource, asOf),
      label: dp(moodLabel, analysisSource, asOf)
    },
    sectors: (cards.sectorRotation || [])
      .slice()
      .sort((left, right) => (parseNumber(right.moneyFlowScore) ?? -1) - (parseNumber(left.moneyFlowScore) ?? -1))
      .slice(0, 8)
      .map((sector, index) => ({
      rank: index + 1,
      sector: normalizeText(sector.sector, "Sector"),
      moneyFlowScore: dp(parseNumber(sector.moneyFlowScore), analysisSource, asOf),
      statusVsPrevious: dp(normalizeText(sector.rotationStatus, "Neutral"), analysisSource, asOf),
      whyMoving: dp([
        normalizeText(sector.priceRelativeStrengthEvidence, ""),
        normalizeText(sector.whyStrongOrWeak, ""),
        normalizeText(sector.tradingView, "")
      ].filter(Boolean), sector.source || analysisSource, asOf),
      beneficiaries: dp(splitList(sector.beneficiaryOrAffectedStocks), sector.source || analysisSource, asOf),
      bestFnoPick: dp(splitList(sector.beneficiaryOrAffectedStocks)[0] || "Watchlist only", sector.source || analysisSource, asOf)
    })),
    swingOpportunities: (cards.highPotentialWatchlist || []).slice(0, 5).map((item) => ({
      stock: dp(normalizeText(item.stock, "Watchlist only"), analysisSource, asOf),
      sector: dp(normalizeText(item.tradeType, "Watchlist"), analysisSource, asOf),
      conviction: dp(item.scoreOutOf10 ? `${item.scoreOutOf10}/10` : "Watchlist only", analysisSource, asOf),
      reason: dp(normalizeText(item.reason, "Await verified setup."), analysisSource, asOf)
    })),
    btstIdeas: (cards.topBTSTIdeas || []).slice(0, 3).map((item) => ({
      stock: dp(normalizeText(item.stock, "Watchlist only"), analysisSource, asOf),
      entry: dp(normalizeText(item.entryTrigger, "Watchlist only"), analysisSource, asOf),
      stopLoss: dp(normalizeText(item.stopLoss, "Watchlist only"), analysisSource, asOf),
      target: dp([item.target1, item.target2].filter(Boolean).join(" / ") || "Watchlist only", analysisSource, asOf)
    })),
    indexLevels: {
      resistance1: dp(levelValue(firstLevel(niftyLevels, /resistance/i, 0)), cards.indexLevels?.source || analysisSource, asOf),
      resistance2: dp(levelValue(firstLevel(niftyLevels, /resistance/i, 1)), cards.indexLevels?.source || analysisSource, asOf),
      support1: dp(levelValue(firstLevel(niftyLevels, /support/i, 0)), cards.indexLevels?.source || analysisSource, asOf),
      support2: dp(levelValue(firstLevel(niftyLevels, /support/i, 1)), cards.indexLevels?.source || analysisSource, asOf),
      trend: dp(normalizeText(globalConclusion.mostImportantGlobalFactorForIndia, "Watch levels closely"), analysisSource, asOf),
      bias: dp(parseBias(moodLabel, moodScore) === "Bullish" ? "Mild Positive" : parseBias(moodLabel, moodScore), analysisSource, asOf)
    },
    optionsSetup: {
      pcr: dp(parseNumber(optionsNifty.pcr), optionsNifty.source || "NSE option chain", asOf),
      maxPain: dp(parseNumber(optionsNifty.maxPain), optionsNifty.source || "NSE option chain", asOf),
      maxCallOi: dp(parseNumber(optionsNifty.maxCallOi), optionsNifty.source || "NSE option chain", asOf),
      maxPutOi: dp(parseNumber(optionsNifty.maxPutOi), optionsNifty.source || "NSE option chain", asOf),
      freshLongBuildUp: dp(splitList(cards.optionsSetup?.stockFuturesBuildUp?.freshLongBuildUp).join(", ") || null, "F&O buildup", asOf),
      freshShortBuildUp: dp(splitList(cards.optionsSetup?.stockFuturesBuildUp?.freshShortBuildUp).join(", ") || null, "F&O buildup", asOf)
    },
    macroCalendar: (cards.macroCalendar || []).slice(0, 5).map((event) => ({
      time: dp(normalizeText(event.dateTimeIST, "Data unavailable"), event.source, asOf),
      event: dp(normalizeText(event.event, "Data unavailable"), event.source, asOf),
      importance: dp(importanceScore(event.importance), event.source, asOf),
      affectedSectors: dp(normalizeText(event.affectedSectors, "All"), event.source, asOf),
      expectedImpact: dp(normalizeText(event.likelyImpact, "Watch for volatility."), event.source, asOf)
    })),
    keyRisks: dp([
      ...(cards.dataGaps || []).map((gap) => `${gap.field}: ${gap.requiredAction || gap.reason}`),
      ...(cards.newsAndStockImpact || []).slice(0, 3).map((news) => `${news.newsEvent}: ${news.expectedImpact || news.impact}`)
    ].filter(Boolean).slice(0, 5), analysisSource, asOf),
    tradingPlan: {
      gapUp: dp([normalizeText(mood.bullishCondition, "Avoid chasing the gap."), normalizeText(cards.indexLevels?.indexOptionsPlan?.ceEntryCondition, "Wait for confirmation.")], analysisSource, asOf),
      flat: dp([normalizeText(mood.neutralCondition, "Trade selectively."), normalizeText(cards.indexLevels?.indexOptionsPlan?.noTradeZone, "Avoid low-conviction trades.")], analysisSource, asOf),
      gapDown: dp([normalizeText(mood.bearishCondition, "Protect capital first."), normalizeText(cards.indexLevels?.indexOptionsPlan?.peEntryCondition, "Wait for breakdown confirmation.")], analysisSource, asOf)
    },
    footer: template.footer
  };
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
  if (process.env.OPENAI_RESPONSE_FILE) {
    const responsePath = path.resolve(rootDir, process.env.OPENAI_RESPONSE_FILE);
    console.log(`Converting saved OpenAI response from ${responsePath}...`);
    const savedResponse = JSON.parse(await readFile(responsePath, "utf8"));
    return convertOpenAiPayloadResult(savedResponse, template, generatedAt);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY is not set. Keeping existing data or falling back to mock data.");
    return null;
  }

  const payload = await loadOpenAiPayload();
  if (payload) {
    const requestBody = applyPayloadRuntimeOverrides(payload, generatedAt);

    console.log("Generating morning brief with configured OpenAI payload...");
    const parsedResponse = await callOpenAI({ apiKey, body: requestBody });
    const payloadResult = extractJson(extractOutputText(parsedResponse));
    return convertOpenAiPayloadResult(payloadResult, template, generatedAt);
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
  const existing = await loadExistingMorningBriefData();
  let generated = null;

  try {
    generated = await generateWithOpenAI({ rawMarketData, template, generatedAt });
  } catch (error) {
    console.error("Morning brief data download failed. Keeping previous data if available.");
    console.error(error);
  }

  if (generated) {
    const quality = validateGeneratedBriefQuality(generated);
    if (!quality.ok) {
      console.error("Morning brief data was too sparse. Keeping previous data instead.");
      quality.failures.forEach((failure) => console.error(`- ${failure}`));
      generated = null;
    }
  }

  if (!generated && existing) {
    console.log("No complete new morning brief was written. Existing data remains unchanged.");
    return;
  }

  const data = generated ?? template;
  const nextData = {
    ...data,
    generatedAt: data.generatedAt || generatedAt,
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
