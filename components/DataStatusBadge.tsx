import type { DataPoint, DataStatus } from "@/lib/types";

const statusClasses: Record<DataStatus, string> = {
  verified: "bg-pulse-pale text-pulse-green",
  stale: "bg-amber-50 text-amber-700",
  unavailable: "bg-slate-100 text-slate-500"
};

export function DataStatusBadge({ point }: { point: DataPoint<unknown> }) {
  return (
    <span className={`inline-flex rounded px-2 py-1 text-[10px] font-black uppercase ${statusClasses[point.status]}`} title={`${point.source} · ${point.asOf}`}>
      {point.status}
    </span>
  );
}

export function displayValue<T>(point: DataPoint<T>, formatter?: (value: NonNullable<T>) => string) {
  if (point.status === "unavailable" || point.value === null || point.value === undefined) return "Unavailable";
  if (formatter) return formatter(point.value as NonNullable<T>);
  return String(point.value);
}

export function toneFor(point: DataPoint<unknown>) {
  if (point.status === "unavailable") return "text-slate-500";
  if ((point.change ?? 0) > 0 || (point.changePercent ?? 0) > 0) return "text-pulse-green";
  if ((point.change ?? 0) < 0 || (point.changePercent ?? 0) < 0) return "text-pulse-red";
  return "text-pulse-ink";
}
