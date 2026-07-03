import type { ReactNode } from "react";
import type { BtstIdea, DataPoint, MacroEvent, MorningBriefData, SectorRow, SwingOpportunity } from "@/lib/types";
import { displayValue, toneFor } from "./DataStatusBadge";
import { ConfidenceGauge } from "./MarketMoodGauge";

const money = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

const sectorIconMap: Record<string, string> = {
  Defence: "shield",
  Banking: "bank",
  "PSU Banks": "bank",
  "Financial Services": "wallet",
  "Capital Goods": "factory",
  Infrastructure: "tower",
  Power: "bolt",
  Auto: "car",
  Pharma: "nodes",
  Healthcare: "heart",
  IT: "monitor",
  Energy: "flame",
  "Oil & Gas": "droplet",
  FMCG: "cart",
  Metals: "mine",
  Realty: "building",
  "Consumer Durables": "appliance",
  Chemicals: "flask",
  Railways: "train",
  Renewables: "leaf"
};

function changeLabel(point: DataPoint<number>) {
  if (point.status === "unavailable") return "Unavailable";
  const change = point.change ?? 0;
  const percent = point.changePercent ?? 0;
  const sign = change > 0 ? "+" : "";
  return `${sign}${money.format(change)} (${sign}${percent.toFixed(2)}%)`;
}

function SectionCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <article className={`rounded-[7px] border border-pulse-border bg-white p-6 ${className}`}>
      <h3 className="mb-5 text-sm font-black uppercase">{title}</h3>
      {children}
    </article>
  );
}

export function HeroBrief({ page, lastRefreshed }: { page: MorningBriefData["page"]; lastRefreshed: string }) {
  return (
    <div>
      <p className="mb-11 text-xs font-black uppercase text-pulse-ink">{displayValue(page.dateLabel)}</p>
      <h1 className="font-serif text-[64px] font-black leading-none tracking-normal text-pulse-ink max-sm:text-5xl">{displayValue(page.title)}</h1>
      <p className="my-10 max-w-3xl text-lg leading-9 text-[#273033]">{displayValue(page.summary)}</p>
      <div className="flex items-center gap-10 max-sm:flex-col max-sm:items-start max-sm:gap-4">
        <strong className="min-w-36 rounded border border-pulse-border px-5 py-4 text-center font-serif text-2xl font-black uppercase text-pulse-green">{displayValue(page.bias)}</strong>
        <span className="text-sm font-medium text-[#293234]">Market bias for the day</span>
      </div>
      <p className="mt-6 text-xs text-pulse-muted">{displayValue(page.timestamp)}</p>
      <p className="mt-2 text-xs text-pulse-muted">Last refreshed: {new Date(lastRefreshed).toLocaleString()}</p>
    </div>
  );
}

export function MarketSnapshotCard({ snapshot }: { snapshot: MorningBriefData["marketSnapshot"] }) {
  const rows = [
    ["Nifty 50", snapshot.nifty],
    ["Bank Nifty", snapshot.bankNifty],
    ["GIFT Nifty", snapshot.giftNifty],
    ["India VIX", snapshot.indiaVix]
  ] as const;

  return (
    <SectionCard title="Market Snapshot">
      <div className="space-y-5">
        {rows.map(([label, point]) => (
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-sm" key={label}>
            <span>{label}</span>
            <strong className="text-base">{displayValue(point, (v) => money.format(v))}</strong>
            <em className={`text-xs not-italic font-black ${toneFor(point)}`}>{changeLabel(point)}</em>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function GlobalCuesCard({ cues }: { cues: MorningBriefData["globalCues"] }) {
  return (
    <SectionCard title="Global Cues">
      <div className="divide-y divide-pulse-border">
        {cues.map((cue) => (
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-3 text-sm" key={cue.name}>
            <span>{cue.name}</span>
            <strong>{cue.displayValue}</strong>
            <em className={`text-xs not-italic font-black ${cue.tone === "negative" ? "text-pulse-red" : cue.tone === "positive" ? "text-pulse-green" : "text-slate-500"}`}>{cue.changeLabel}</em>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function FiiDiiCard({ data }: { data: MorningBriefData["fiiDii"] }) {
  return (
    <SectionCard title="FII / DII Activity">
      <div className="grid grid-cols-2 gap-5">
        <div>
          <span className="text-sm">FII Net</span>
          <strong className="mt-4 block text-3xl text-pulse-red">-₹{money.format(Math.abs(data.fiiNet.value ?? 0))} Cr</strong>
          <p className="mt-2 text-sm">(Negative)</p>
        </div>
        <div className="border-l border-pulse-border pl-5">
          <span className="text-sm">DII Net</span>
          <strong className="mt-4 block text-3xl text-pulse-green">+₹{money.format(data.diiNet.value ?? 0)} Cr</strong>
          <p className="mt-2 text-sm">(Positive)</p>
        </div>
      </div>
      <p className="mt-8 border-t border-pulse-border pt-5 text-sm leading-6 text-[#30393b]">{displayValue(data.interpretation)}</p>
    </SectionCard>
  );
}

export function SectorRotationTable({ sectors }: { sectors: SectorRow[] }) {
  const sectorMeta = (sector: SectorRow) => {
    const status = String(sector.statusVsPrevious.value ?? "");
    const score = sector.moneyFlowScore.value ?? 0;
    const isWeak = status.includes("Weak");
    const isNeutral = status.includes("Neutral");
    const tone = isWeak ? "weak" : isNeutral ? "neutral" : sector.rank === 1 ? "strong" : "improving";
    const color = tone === "weak" ? "#ff5d55" : tone === "neutral" ? "#f6c21a" : tone === "improving" ? "#7bbb69" : "#0b6b3f";
    const textColor = tone === "weak" ? "text-[#ff3d3a]" : tone === "neutral" ? "text-[#d79a00]" : "text-pulse-green";
    const conviction = score >= 80 ? "High Conviction" : score >= 60 ? "Moderate Conviction" : "Low Conviction";
    const icon = sectorIconMap[sector.sector] ?? "sector";
    const statusMatch = status.match(/^(.+?)\s*(\([^)]+\))?$/);
    return { color, textColor, conviction, icon, statusMain: statusMatch?.[1] ?? status, statusDelta: statusMatch?.[2] ?? "" };
  };

  const iconPath = (name: string) => {
    const paths: Record<string, ReactNode> = {
      shield: <><path d="M12 3l7 3v5c0 4.6-3 7.8-7 10-4-2.2-7-5.4-7-10V6l7-3z" /><path d="M9 12l2 2 4-5" /></>,
      nodes: <><circle cx="7" cy="7" r="3" /><circle cx="17" cy="17" r="3" /><circle cx="8" cy="18" r="2" /><path d="M9.2 9.2l5.6 5.6M9.2 16.8l5.6-7.6" /></>,
      factory: <><path d="M4 20V9l5 4V9l5 4h6v7H4z" /><path d="M7 20v-4h3v4M14 20v-4h3v4" /></>,
      bank: <><path d="M4 10h16L12 5 4 10zM6 10v8M10 10v8M14 10v8M18 10v8M4 18h16" /></>,
      tower: <><path d="M12 4l5 16M12 4L7 20M9 11h6M8 15h8M10 8h4" /></>,
      car: <><path d="M5 15l1.5-4h11L19 15v3H5v-3z" /><circle cx="8" cy="18" r="1.5" /><circle cx="16" cy="18" r="1.5" /></>,
      mine: <><path d="M4 19h16L12 5 4 19z" /><path d="M12 5v14M8 13h8" /></>,
      monitor: <><rect x="4" y="5" width="16" height="11" rx="1" /><path d="M9 20h6M12 16v4" /></>,
      wallet: <><path d="M4 7h15a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13" /><path d="M16 13h5" /><circle cx="17" cy="13" r="1" /></>,
      bolt: <path d="M13 2L4 14h7l-1 8 9-13h-7l1-7z" />,
      heart: <path d="M20.8 6.6a5.2 5.2 0 0 0-7.4 0L12 8l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 22l8.8-8a5.2 5.2 0 0 0 0-7.4z" />,
      flame: <path d="M12 22c4 0 7-2.8 7-6.8 0-3.2-1.8-5.4-4.2-7.7-.7 2.2-2.1 3.3-3.7 4.5.2-3-1.1-5.4-3.4-8C7 7.6 5 10.7 5 15.2 5 19.2 8 22 12 22z" />,
      droplet: <path d="M12 3s7 7.1 7 12a7 7 0 0 1-14 0c0-4.9 7-12 7-12z" />,
      cart: <><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M3 4h2l2.5 11h10.8l2-7H7" /></>,
      building: <><path d="M4 21V7l8-4 8 4v14" /><path d="M9 21v-5h6v5M8 9h.01M12 9h.01M16 9h.01M8 13h.01M16 13h.01" /></>,
      appliance: <><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M8 8h8M9 14h6M9 17h6" /><circle cx="16" cy="11" r="1" /></>,
      flask: <><path d="M9 3h6M10 3v6l-5 9a3 3 0 0 0 2.6 4h8.8A3 3 0 0 0 19 18l-5-9V3" /><path d="M8 15h8" /></>,
      train: <><rect x="6" y="3" width="12" height="13" rx="2" /><path d="M9 20l3-4 3 4M9 7h6M8 11h8" /><circle cx="9" cy="14" r="1" /><circle cx="15" cy="14" r="1" /></>,
      leaf: <><path d="M20 4c-8 0-14 5-14 12a4 4 0 0 0 4 4c7 0 10-8 10-16z" /><path d="M4 20c3-5 7-8 13-10" /></>,
      sector: <><circle cx="12" cy="12" r="8" /><path d="M12 4v8l6 4" /></>
    };
    return paths[name] ?? paths.monitor;
  };

  return (
    <section id="markets" className="rounded-[7px] border border-pulse-border bg-white px-6 pb-0 pt-7 shadow-soft">
      <div className="mb-6 flex items-start justify-between gap-4 max-md:flex-col">
        <div>
          <h2 className="text-base font-black uppercase text-pulse-green">Sector Rotation</h2>
          <p className="mt-2 text-xs font-semibold text-pulse-muted">Ranked by Money Flow Strength vs Previous Session</p>
        </div>
        <div className="flex flex-wrap gap-7 text-sm">
          <span className="inline-flex items-center gap-3"><i className="h-4 w-4 rounded-full bg-pulse-green" />Strong</span>
          <span className="inline-flex items-center gap-3"><i className="h-4 w-4 rounded-full bg-[#7bbb69]" />Improving</span>
          <span className="inline-flex items-center gap-3"><i className="h-4 w-4 rounded-full bg-pulse-yellow" />Neutral</span>
          <span className="inline-flex items-center gap-3"><i className="h-4 w-4 rounded-full bg-[#ff5d55]" />Weakening</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-t border-pulse-border">
              <th className="px-4 py-5 text-xs font-black">Rank</th>
              <th className="px-4 py-5 text-xs font-black">Sector</th>
              <th className="px-4 py-5 text-xs font-black">Money Flow Score<br /><small className="text-pulse-muted">(0-100)</small></th>
              <th className="px-4 py-5 text-xs font-black">Status<br /><small className="text-pulse-muted">vs Prev.<br />Session</small></th>
              <th className="px-4 py-5 text-xs font-black">Why It&apos;s Moving</th>
              <th className="px-4 py-5 text-xs font-black">Top Beneficiary Stocks</th>
              <th className="px-4 py-5 text-xs font-black">Best F&O Pick</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((sector) => {
              const meta = sectorMeta(sector);
              return (
              <tr className="border-t border-pulse-border align-middle" key={sector.sector}>
                <td className="px-4 py-8">
                  <span className="grid h-[30px] w-[30px] place-items-center rounded-md font-black text-white" style={{ backgroundColor: meta.color }}>{sector.rank}</span>
                </td>
                <td className="px-4 py-8">
                  <div className="flex items-center gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: meta.color }}>
                      <svg className="h-6 w-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round">{iconPath(meta.icon)}</svg>
                    </span>
                    <strong className="whitespace-nowrap text-sm">{sector.sector}</strong>
                  </div>
                </td>
                <td className="px-4 py-8">
                  <div className="w-40 text-center">
                    <strong className="block text-[26px] font-black leading-none text-pulse-green">{displayValue(sector.moneyFlowScore)}</strong>
                    <span className="mt-3 block h-2 rounded-full bg-[#dfdfdc]">
                      <i className="block h-full rounded-full bg-pulse-green" style={{ width: `${sector.moneyFlowScore.value ?? 0}%` }} />
                    </span>
                  </div>
                </td>
                <td className="px-4 py-8">
                  <strong className={`block text-sm font-black ${meta.textColor}`}>{meta.statusMain}</strong>
                  {meta.statusDelta ? <em className={`block text-sm font-black not-italic ${meta.textColor}`}>{meta.statusDelta}</em> : null}
                </td>
                <td className="px-4 py-8">
                  <ul className="list-disc space-y-1 pl-5 text-sm leading-[1.65]">
                    {(sector.whyMoving.value ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </td>
                <td className="px-4 py-8 text-sm leading-[1.65]">{(sector.beneficiaries.value ?? []).join(" · ")}</td>
                <td className="px-4 py-8">
                  <strong className={`block text-sm font-black ${meta.textColor}`}>{displayValue(sector.bestFnoPick)}</strong>
                  <span className="mt-2 inline-block rounded-md px-3 py-1.5 text-xs font-black text-white" style={{ backgroundColor: meta.color }}>
                    {meta.conviction}
                  </span>
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SwingOpportunitiesCard({ items }: { items: SwingOpportunity[] }) {
  return (
    <SectionCard title="Top 5 Swing Opportunities">
      <table className="w-full text-left text-xs">
        <thead><tr><th className="py-2">Stock</th><th>Sector</th><th>Conviction</th><th>Reason</th></tr></thead>
        <tbody>{items.map((item) => <tr className="border-t border-pulse-border" key={item.stock.value}><td className="py-3 font-black">{displayValue(item.stock)}</td><td>{displayValue(item.sector)}</td><td>{displayValue(item.conviction)}</td><td>{displayValue(item.reason)}</td></tr>)}</tbody>
      </table>
    </SectionCard>
  );
}

export function BtstIdeasCard({ items }: { items: BtstIdea[] }) {
  return (
    <SectionCard title="Top 3 BTST Ideas">
      <div className="space-y-5">
        {items.map((item, index) => (
          <div className="grid grid-cols-[28px_1fr] gap-4 border-t border-pulse-border pt-4" key={item.stock.value}>
            <span className="text-xl text-pulse-muted">{index + 1}</span>
            <div><strong className="text-lg">{displayValue(item.stock)}</strong><p className="mt-2 text-sm leading-6">Entry: {displayValue(item.entry)}<br />SL: {displayValue(item.stopLoss)} | Target: {displayValue(item.target)}</p></div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function IndexLevelsCard({ levels }: { levels: MorningBriefData["indexLevels"] }) {
  const rows = [["Resistance 1", levels.resistance1], ["Resistance 2", levels.resistance2], ["Support 1", levels.support1], ["Support 2", levels.support2]] as const;
  return (
    <SectionCard title="Index Levels (Nifty 50)">
      {rows.map(([label, point]) => <div className="flex justify-between border-t border-pulse-border py-4 text-sm" key={label}><span>{label}</span><strong>{displayValue(point, (v) => money.format(v))}</strong></div>)}
      <div className="mt-4 grid grid-cols-2 border-t border-pulse-border pt-5 text-sm font-black"><span>Trend: <b className="text-pulse-green">{displayValue(levels.trend)}</b></span><span>Bias: <b className="text-pulse-green">{displayValue(levels.bias)}</b></span></div>
    </SectionCard>
  );
}

export function OptionsSetupCard({ options }: { options: MorningBriefData["optionsSetup"] }) {
  const rows = [["PCR", options.pcr], ["Max Pain", options.maxPain], ["Max Call OI", options.maxCallOi], ["Max Put OI", options.maxPutOi], ["Fresh long build-up", options.freshLongBuildUp], ["Fresh short build-up", options.freshShortBuildUp]] as const;
  return <SectionCard title="Options Setup">{rows.map(([label, point]) => <div className="flex justify-between py-2 text-sm" key={label}><span>{label}</span><strong className={toneFor(point)}>{displayValue(point as DataPoint<number | string>, (v) => typeof v === "number" ? money.format(v) : v)}</strong></div>)}</SectionCard>;
}

export function MacroCalendarCard({ events }: { events: MacroEvent[] }) {
  return (
    <SectionCard title="Today's Macro Calendar">
      <table className="w-full text-left text-xs">
        <thead><tr><th className="py-2">Time</th><th>Event</th><th>Importance</th><th>Affected Sectors</th><th>Expected impact</th></tr></thead>
        <tbody>{events.map((event) => <tr className="border-t border-pulse-border" key={event.event.value ?? event.time.value ?? "macro-event"}><td className="py-3">{displayValue(event.time)}</td><td>{displayValue(event.event)}</td><td className="text-pulse-yellow">{"★".repeat(event.importance.value ?? 0)}{"☆".repeat(5 - (event.importance.value ?? 0))}</td><td>{displayValue(event.affectedSectors)}</td><td>{displayValue(event.expectedImpact)}</td></tr>)}</tbody>
      </table>
    </SectionCard>
  );
}

export function KeyRisksCard({ risks }: { risks: DataPoint<string[]> }) {
  return <SectionCard title="Key Risks Today"><div className="space-y-4">{(risks.value ?? []).map((risk) => <div className="grid grid-cols-[30px_1fr] gap-3" key={risk}><span className="grid h-7 w-7 place-items-center rounded-full bg-red-50 font-black text-pulse-red">!</span><p className="text-sm leading-6">{risk}</p></div>)}</div></SectionCard>;
}

export function TradingPlanCard({ plan }: { plan: MorningBriefData["tradingPlan"] }) {
  const rows = [["up", "If market opens gap up", plan.gapUp], ["flat", "If market opens flat", plan.flat], ["down", "If market opens gap down", plan.gapDown]] as const;
  return (
    <section id="risk" className="rounded-[7px] border border-pulse-border bg-white p-7">
      <h2 className="text-lg font-black uppercase text-pulse-green">Trading Plan For Today</h2>
      <div className="mt-6 grid grid-cols-3 gap-8 max-lg:grid-cols-1">
        {rows.map(([type, title, point]) => (
          <div className="grid grid-cols-[48px_1fr] gap-4" key={title}>
            <span className={`grid h-12 w-12 place-items-center rounded-full text-2xl text-white ${type === "up" ? "bg-pulse-green" : type === "flat" ? "bg-pulse-yellow" : "bg-pulse-red"}`}>{type === "up" ? "↑" : type === "flat" ? "−" : "↓"}</span>
            <div><strong className="text-xs uppercase">{title}</strong><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{(point.value ?? []).map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SnapshotGrid({ data }: { data: MorningBriefData }) {
  return (
    <section className="grid grid-cols-[1.15fr_1.08fr_1fr_.82fr] max-xl:grid-cols-2 max-lg:grid-cols-1">
      <MarketSnapshotCard snapshot={data.marketSnapshot} />
      <GlobalCuesCard cues={data.globalCues} />
      <FiiDiiCard data={data.fiiDii} />
      <ConfidenceGauge score={data.confidence.score.value ?? 0} label={data.confidence.label.value ?? "Unavailable"} />
    </section>
  );
}
