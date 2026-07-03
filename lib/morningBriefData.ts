import type { DataPoint, MorningBriefData } from "./types";

const asOf = "2026-07-01T08:00:00+05:30";
const closeAsOf = "2026-07-01T15:30:00+05:30";
const source = "Mock Morning Brief Store";

function dp<T>(value: T, overrides: Partial<DataPoint<T>> = {}): DataPoint<T> {
  return {
    value,
    change: null,
    changePercent: null,
    status: "verified",
    source,
    asOf,
    ...overrides
  };
}

export const morningBriefData: MorningBriefData = {
  generatedAt: "2026-07-01T08:00:00+05:30",
  lastRefreshed: "2026-07-01T08:00:00+05:30",
  page: {
    dateLabel: dp("WED, 1 JUL 2026"),
    title: dp("Morning Market Brief"),
    summary: dp("Indian equities set for a cautious positive start with supportive global cues, lower crude prices and strong domestic flows. Stay selective and protect capital."),
    bias: dp("Bullish"),
    timestamp: dp("Data as of 1 Jul 2026, 8:00 AM IST")
  },
  moodIndex: {
    score: dp(62, { source: "MarketPulse model" }),
    label: dp("Greed", { source: "MarketPulse model" }),
    ranges: [
      { color: "green", zone: "Extreme Fear", range: "0-25" },
      { color: "yellow", zone: "Fear", range: "26-45" },
      { color: "gray", zone: "Neutral", range: "46-55" },
      { color: "orange", zone: "Greed", range: "56-75" },
      { color: "red", zone: "Extreme Greed", range: "76-100" }
    ]
  },
  marketSnapshot: {
    nifty: dp(24080, { change: 133, changePercent: 0.55, source: "NSE", asOf: closeAsOf }),
    bankNifty: dp(57920, { change: 234.25, changePercent: 0.41, source: "NSE", asOf: closeAsOf }),
    giftNifty: dp(24125, { change: 145, changePercent: 0.61, source: "GIFT Nifty", asOf }),
    indiaVix: dp(13.05, { change: -0.23, changePercent: -1.73, source: "NSE", asOf: closeAsOf })
  },
  globalCues: [
    { name: "US Markets", displayValue: "Positive", changeLabel: "Positive", tone: "positive", metric: dp("Positive", { source: "AP Global Markets" }) },
    { name: "Asian Markets", displayValue: "Positive", changeLabel: "Positive", tone: "positive", metric: dp("Positive", { source: "AP Global Markets" }) },
    { name: "Brent Crude", displayValue: "$72.40", changeLabel: "-0.6%", tone: "negative", metric: dp(72.4, { changePercent: -0.6, source: "Commodity reference" }) },
    { name: "USD Index", displayValue: "105.21", changeLabel: "+0.2%", tone: "positive", metric: dp(105.21, { changePercent: 0.2, source: "Currency reference" }) },
    { name: "Gold (Spot)", displayValue: "$2,341", changeLabel: "+0.4%", tone: "positive", metric: dp(2341, { changePercent: 0.4, source: "Commodity reference" }) }
  ],
  fiiDii: {
    fiiNet: dp(-1350, { source: "FII / DII reference", asOf: "2026-06-30T18:00:00+05:30" }),
    diiNet: dp(2800, { source: "FII / DII reference", asOf: "2026-06-30T18:00:00+05:30" }),
    interpretation: dp("Domestic institutions continue to support the market.", { source: "MarketPulse desk" })
  },
  confidence: {
    score: dp(6.8, { source: "MarketPulse model" }),
    label: dp("Cautiously Bullish", { source: "MarketPulse model" })
  },
  sectors: [
    ["Defence", 92, "Strongest (+2)", ["Government orders & policy push", "Strong order books & exports", "Heavy institutional buying"], ["HAL", "BEL", "Bharat Forge", "BDL", "Cochin Shipyard"], "BHARAT FORGE"],
    ["Pharma", 88, "Improving (+1)", ["Defensive buying in market", "USFDA outlook improving", "Weak INR supports exports"], ["Lupin", "Dr Reddy's", "Laurus Labs", "Sun Pharma"], "LUPIN"],
    ["Capital Goods", 81, "Improving (+2)", ["Manufacturing capex cycle", "Infra spending acceleration", "Private sector capex pickup"], ["Siemens", "ABB", "Cummins", "Bharat Forge"], "SIEMENS"],
    ["PSU Banks", 74, "Improving (+1)", ["Credit growth stays strong", "Attractive valuations", "Govt. spending & infra push"], ["SBI", "Canara Bank", "Bank of Baroda", "PNB"], "SBI"],
    ["Infrastructure", 68, "Neutral (0)", ["Govt. capex in focus", "Order inflow steady", "Execution challenges remain"], ["L&T", "NCC", "IRCON", "NBCC"], "L&T"],
    ["Auto", 56, "Weakening (-1)", ["Monsoon uncertainty", "Rural demand still sluggish", "High inventory in dealers"], ["Maruti Suzuki", "Tata Motors", "M&M"], "MARUTI"],
    ["Metals", 48, "Weakening (-1)", ["China demand concerns", "Commodity prices soft", "Margin pressure"], ["Tata Steel", "JSW Steel", "Hindalco"], "HINDALCO"],
    ["IT", 41, "Weakening (-2)", ["US dollar strength", "Weak global tech sentiment", "Profit booking in IT"], ["TCS", "Infosys", "HCL Tech", "Wipro"], "TCS"]
  ].map(([sector, score, status, why, beneficiaries, pick], index) => ({
    rank: index + 1,
    sector: sector as string,
    moneyFlowScore: dp(score as number, { source: "MarketPulse model" }),
    statusVsPrevious: dp(status as string, { source: "MarketPulse model" }),
    whyMoving: dp(why as string[], { source: "MarketPulse desk" }),
    beneficiaries: dp(beneficiaries as string[], { source: "MarketPulse desk" }),
    bestFnoPick: dp(pick as string, { source: "MarketPulse desk" })
  })),
  swingOpportunities: [
    ["Bharat Forge", "Defence", "9.6/10", "Strong accumulation, defence leadership, exports, FAO"],
    ["HAL", "Defence", "9.5/10", "Robust order book, govt backing, FAO"],
    ["BEL", "Defence", "9.4/10", "Strong earnings visibility, radar & electronics leader"],
    ["Lupin", "Pharma", "9.3/10", "Defensive + export demand, rel. strength"],
    ["Laurus Labs", "Pharma", "8.9/10", "Strong API business, US opportunity, accumulation"]
  ].map(([stock, sector, conviction, reason]) => ({
    stock: dp(stock),
    sector: dp(sector),
    conviction: dp(conviction),
    reason: dp(reason)
  })),
  btstIdeas: [
    ["Lupin", "Above 1,480", "1,455", "1,520 / 1,550"],
    ["Bharat Forge", "Above 1,215", "1,190", "1,245 / 1,275"],
    ["SBI", "Above 840", "825", "855 / 870"]
  ].map(([stock, entry, stopLoss, target]) => ({
    stock: dp(stock),
    entry: dp(entry),
    stopLoss: dp(stopLoss),
    target: dp(target)
  })),
  indexLevels: {
    resistance1: dp(24150, { source: "Nifty close" }),
    resistance2: dp(24250, { source: "Nifty close" }),
    support1: dp(23900, { source: "Nifty close" }),
    support2: dp(23750, { source: "Nifty close" }),
    trend: dp("Uptrend", { source: "MarketPulse model" }),
    bias: dp("Mild Positive", { source: "MarketPulse model" })
  },
  optionsSetup: {
    pcr: dp(0.98, { source: "Options reference" }),
    maxPain: dp(24000, { source: "Options reference" }),
    maxCallOi: dp(24200, { source: "Options reference" }),
    maxPutOi: dp(24000, { source: "Options reference" }),
    freshLongBuildUp: dp("24,050 CE, 57,800 PE", { source: "Options reference" }),
    freshShortBuildUp: dp("24,250 CE", { source: "Options reference" })
  },
  macroCalendar: [
    ["11:30 AM", "India GDP Growth Q1 (Final)", 4, "All", "Broad market sensitivity"],
    ["01:00 PM", "US CB Consumer Confidence", 3, "IT, Auto, FMCG, Banks", "Global risk sentiment"],
    ["07:30 PM", "US Dallas Fed Manufacturing Index", 3, "Metals, Industrial, Capital Goods", "Cyclical demand signal"]
  ].map(([time, event, importance, affected, impact]) => ({
    time: dp(time as string),
    event: dp(event as string),
    importance: dp(importance as number),
    affectedSectors: dp(affected as string),
    expectedImpact: dp(impact as string)
  })),
  keyRisks: dp([
    "Volatility in global markets ahead of US jobs data",
    "Crude oil price spike above $75",
    "Rupee weakness may pressure FII flows",
    "Monsoon progress below normal remains a risk"
  ]),
  tradingPlan: {
    gapUp: dp(["Avoid chasing the gap", "Wait for 15-30 mins consolidation", "Buy only in strong sectors on pullbacks"]),
    flat: dp(["Focus on relative strength stocks", "Look for breakouts with volume", "Avoid weak sectors"]),
    gapDown: dp(["Watch support at 23,900", "If support holds, look for buying in strong sectors", "Avoid panic selling"])
  },
  footer: {
    ctaTitle: dp("Never miss the morning brief."),
    ctaSubtitle: dp("One alert when the new daily edition is ready."),
    sources: dp(["AP Global Markets", "Nifty close", "19 June market close", "FII / DII reference"]),
    disclaimer: dp("Independent market intelligence for educational use only."),
    copyright: dp("© 2026 Market Pulse Desk")
  }
};
