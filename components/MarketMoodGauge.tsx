import type { MorningBriefData } from "@/lib/types";
import { displayValue } from "./DataStatusBadge";

export function MarketMoodGauge({ mood }: { mood: MorningBriefData["moodIndex"] }) {
  const score = mood.score.value ?? 0;
  const centerX = 360;
  const centerY = 335;
  const radius = 240;
  const angle = (180 - (score / 100) * 180) * Math.PI / 180;
  const x2 = centerX + radius * Math.cos(angle);
  const y2 = centerY - radius * Math.sin(angle);

  return (
    <div className="rounded-[7px] border border-pulse-border bg-white p-5 shadow-soft">
      <div className="mb-2 text-sm font-black uppercase">Market Mood Index <span className="ml-1 inline-grid h-4 w-4 place-items-center rounded-full border border-slate-400 text-[10px] normal-case">i</span></div>
      <div className="grid grid-cols-[minmax(420px,1fr)_240px] items-center gap-5 max-lg:grid-cols-1">
        <div>
          <svg className="mx-auto block h-auto w-full max-w-[500px] overflow-visible" viewBox="0 0 720 390" role="img" aria-label="Market mood index gauge">
            <path className="fill-none stroke-[#2caf66] [stroke-width:76px]" d="M 75.00 335.00 A 285 285 0 0 1 128.23 169.88" />
            <path className="fill-none stroke-[#f5c50b] [stroke-width:76px]" d="M 142.64 151.10 A 285 285 0 0 1 266.36 65.71" />
            <path className="fill-none stroke-[#bdc4c8] [stroke-width:76px]" d="M 290.91 58.52 A 285 285 0 0 1 429.09 58.52" />
            <path className="fill-none stroke-[#f59a13] [stroke-width:76px]" d="M 453.64 65.71 A 285 285 0 0 1 577.36 151.10" />
            <path className="fill-none stroke-[#ec493d] [stroke-width:76px]" d="M 591.77 169.88 A 285 285 0 0 1 645.00 335.00" />
            <text className="fill-black font-black" style={{ fontFamily: "Impact, Arial Black, sans-serif", fontSize: 35 }} textAnchor="middle" x="145" y="255" transform="rotate(-66 145 255)"><tspan x="145">EXTREME</tspan><tspan x="145" dy="34">FEAR</tspan></text>
            <text className="fill-black font-black" style={{ fontFamily: "Impact, Arial Black, sans-serif", fontSize: 35 }} textAnchor="middle" x="230" y="118" transform="rotate(-34 230 118)">FEAR</text>
            <text className="fill-black font-black" style={{ fontFamily: "Impact, Arial Black, sans-serif", fontSize: 30 }} textAnchor="middle" x="360" y="82">NEUTRAL</text>
            <text className="fill-black font-black" style={{ fontFamily: "Impact, Arial Black, sans-serif", fontSize: 35 }} textAnchor="middle" x="490" y="118" transform="rotate(34 490 118)">GREED</text>
            <text className="fill-black font-black" style={{ fontFamily: "Impact, Arial Black, sans-serif", fontSize: 35 }} textAnchor="middle" x="575" y="255" transform="rotate(66 575 255)"><tspan x="575">EXTREME</tspan><tspan x="575" dy="34">GREED</tspan></text>
            <line x1="360" y1="335" x2={x2} y2={y2} className="stroke-[#292929] [stroke-width:10px]" strokeLinecap="round" />
            <path className="fill-[#303030]" d="M 305 352 A 55 55 0 0 1 415 352 Z" />
          </svg>
          <div className="text-center">
            <strong className="text-[44px] leading-none text-pulse-orange">{displayValue(mood.score)}</strong>
            <span className="ml-1 text-xl">/100</span>
            <div className="text-sm font-black text-pulse-orange">{displayValue(mood.label)}</div>
            <p className="mt-2 text-xs text-pulse-muted">Updated on : 1st Jul 2026</p>
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-lg font-black">Market Mood Color Scale</h3>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr><th className="border border-slate-300 p-3 text-left">Color</th><th className="border border-slate-300 p-3 text-left">Zone</th><th className="border border-slate-300 p-3 text-left">Range</th></tr>
            </thead>
            <tbody>
              {mood.ranges.map((range) => (
                <tr key={range.zone}>
                  <td className="border border-slate-300 p-3"><span className={`block h-6 w-6 rounded-full ${range.color === "green" ? "bg-[#2caf66]" : range.color === "yellow" ? "bg-[#f5c50b]" : range.color === "gray" ? "bg-[#bdc4c8]" : range.color === "orange" ? "bg-[#f59a13]" : "bg-[#ec493d]"}`} /></td>
                  <td className="border border-slate-300 p-3 font-bold">{range.zone}</td>
                  <td className="border border-slate-300 p-3 font-bold">{range.range}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ConfidenceGauge({ score, label }: { score: number; label: string }) {
  const fillDeg = (score / 10) * 180;
  return (
    <div className="rounded-[7px] border border-pulse-border bg-white p-6">
      <div className="text-sm font-black uppercase">Market Mood</div>
      <div className="relative mx-auto mt-8 h-[82px] w-[150px] overflow-hidden rounded-t-[150px]" style={{ background: `conic-gradient(from 270deg at 50% 100%, #0b6b3f 0 ${fillDeg}deg, #d8d8d7 ${fillDeg}deg 180deg, transparent 180deg 360deg)` }}>
        <div className="absolute bottom-0 left-[9px] right-[9px] h-[73px] rounded-t-[132px] bg-white" />
      </div>
      <div className="relative z-10 -mt-8 text-center"><strong className="font-serif text-[42px]">{score}</strong><span className="text-lg text-pulse-muted">/10</span></div>
      <p className="mt-2 text-center font-extrabold text-pulse-green">{label}</p>
      <p className="mt-4 text-center text-xs text-pulse-muted">Confidence Score</p>
    </div>
  );
}
