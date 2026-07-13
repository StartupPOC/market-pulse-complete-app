import type { MorningBriefData } from "@/lib/types";
import { displayValue } from "./DataStatusBadge";

const moodColors = {
  green: "#20ad66",
  yellow: "#f4c20d",
  gray: "#c7cccf",
  orange: "#f59d14",
  red: "#ef493e"
} as const;

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const angleInRadians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function parseRange(range: string) {
  const [rawStart, rawEnd] = range.split("-").map((part) => Number(part.trim()));
  return {
    start: Number.isFinite(rawStart) ? rawStart : 0,
    end: Number.isFinite(rawEnd) ? rawEnd : 0
  };
}

function rangeToAngles(start: number, end: number) {
  return {
    startAngle: -90 + (start / 100) * 180,
    endAngle: -90 + (end / 100) * 180
  };
}

export function MarketMoodGauge({ mood }: { mood: MorningBriefData["moodIndex"] }) {
  const score = mood.score.value ?? 0;
  const label = displayValue(mood.label);
  const currentRange = mood.ranges.find((range) => {
    const [min, max] = range.range.split("-").map((part) => Number(part.trim()));
    return score >= min && score <= max;
  });
  const activeColor = currentRange ? moodColors[currentRange.color] : moodColors.gray;

  return (
    <div className="rounded-[7px] border border-pulse-border bg-white px-8 py-7 shadow-soft">
      <div className="text-lg font-black uppercase leading-none">Market Mood Index</div>
      <div className="mx-auto mt-8 max-w-[360px]">
        <div className="relative">
          <svg className="block h-auto w-full overflow-visible" viewBox="0 0 360 220" role="img" aria-label={`Market mood index ${score} out of 100, ${label}`}>
            {mood.ranges.map((range, index) => {
              const current = parseRange(range.range);
              const previous = index > 0 ? parseRange(mood.ranges[index - 1].range) : null;
              const start = previous ? previous.end : current.start;
              const { startAngle, endAngle } = rangeToAngles(start, current.end);
              return (
                <path
                  className="fill-none"
                  d={describeArc(180, 180, 134, startAngle, endAngle)}
                  key={range.zone}
                  stroke={moodColors[range.color]}
                  strokeLinecap="butt"
                  strokeWidth="16"
                />
              );
            })}
          </svg>
          <div className="absolute inset-x-0 bottom-1 text-center">
            <div>
              <strong className="font-serif text-[62px] leading-none text-pulse-text">{displayValue(mood.score)}</strong>
              <span className="ml-1 align-baseline text-[24px] leading-none text-pulse-muted">/100</span>
            </div>
            <div className="mt-3 text-2xl font-black leading-tight" style={{ color: activeColor }}>{label}</div>
          </div>
        </div>
      </div>
      <div className="mt-9 grid grid-cols-5 gap-2 border-t border-pulse-border pt-4 max-sm:grid-cols-2">
        {mood.ranges.map((range) => (
          <div className="min-w-0 text-center" key={range.zone}>
            <span className="mx-auto block h-3 w-3 rounded-full" style={{ backgroundColor: moodColors[range.color] }} />
            <div className="mt-2 text-[11px] font-black leading-tight text-pulse-text">{range.zone}</div>
            <div className="mt-1 text-[10px] font-bold text-pulse-muted">{range.range}</div>
          </div>
        ))}
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
