export type DataStatus = "verified" | "unavailable" | "stale";

export type DataPoint<T> = {
  value: T | null;
  change?: number | null;
  changePercent?: number | null;
  status: DataStatus;
  source: string;
  asOf: string;
};

export type MoodRange = {
  color: "green" | "yellow" | "gray" | "orange" | "red";
  zone: string;
  range: string;
};

export type MarketIndexKey = "nifty" | "bankNifty" | "giftNifty" | "indiaVix";

export type MarketCue = {
  name: string;
  displayValue: string;
  changeLabel: string;
  tone: "positive" | "negative" | "neutral";
  metric: DataPoint<number | string>;
};

export type SectorRow = {
  rank: number;
  sector: string;
  moneyFlowScore: DataPoint<number>;
  statusVsPrevious: DataPoint<string>;
  whyMoving: DataPoint<string[]>;
  beneficiaries: DataPoint<string[]>;
  bestFnoPick: DataPoint<string>;
};

export type SwingOpportunity = {
  stock: DataPoint<string>;
  sector: DataPoint<string>;
  conviction: DataPoint<string>;
  reason: DataPoint<string>;
};

export type BtstIdea = {
  stock: DataPoint<string>;
  entry: DataPoint<string>;
  stopLoss: DataPoint<string>;
  target: DataPoint<string>;
};

export type IndexLevels = {
  resistance1: DataPoint<number>;
  resistance2: DataPoint<number>;
  support1: DataPoint<number>;
  support2: DataPoint<number>;
  trend: DataPoint<string>;
  bias: DataPoint<string>;
};

export type OptionsSetup = {
  pcr: DataPoint<number>;
  maxPain: DataPoint<number>;
  maxCallOi: DataPoint<number>;
  maxPutOi: DataPoint<number>;
  freshLongBuildUp: DataPoint<string>;
  freshShortBuildUp: DataPoint<string>;
};

export type MacroEvent = {
  time: DataPoint<string>;
  event: DataPoint<string>;
  importance: DataPoint<number>;
  affectedSectors: DataPoint<string>;
  expectedImpact: DataPoint<string>;
};

export type TradingPlan = {
  gapUp: DataPoint<string[]>;
  flat: DataPoint<string[]>;
  gapDown: DataPoint<string[]>;
};

export type MorningBriefData = {
  generatedAt: string;
  lastRefreshed: string;
  page: {
    dateLabel: DataPoint<string>;
    title: DataPoint<string>;
    summary: DataPoint<string>;
    bias: DataPoint<"Bullish" | "Neutral" | "Bearish">;
    timestamp: DataPoint<string>;
  };
  moodIndex: {
    score: DataPoint<number>;
    label: DataPoint<string>;
    ranges: MoodRange[];
  };
  marketSnapshot: Record<MarketIndexKey, DataPoint<number>>;
  globalCues: MarketCue[];
  fiiDii: {
    fiiNet: DataPoint<number>;
    diiNet: DataPoint<number>;
    interpretation: DataPoint<string>;
  };
  confidence: {
    score: DataPoint<number>;
    label: DataPoint<string>;
  };
  sectors: SectorRow[];
  swingOpportunities: SwingOpportunity[];
  btstIdeas: BtstIdea[];
  indexLevels: IndexLevels;
  optionsSetup: OptionsSetup;
  macroCalendar: MacroEvent[];
  keyRisks: DataPoint<string[]>;
  tradingPlan: TradingPlan;
  footer: {
    ctaTitle: DataPoint<string>;
    ctaSubtitle: DataPoint<string>;
    sources: DataPoint<string[]>;
    disclaimer: DataPoint<string>;
    copyright: DataPoint<string>;
  };
};
