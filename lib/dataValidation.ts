import type { DataPoint, MorningBriefData } from "./types";

const STALE_AFTER_HOURS = 48;

function isDataPoint(value: unknown): value is DataPoint<unknown> {
  return Boolean(value && typeof value === "object" && "status" in value && "source" in value && "asOf" in value);
}

function validatePoint<T>(point: DataPoint<T>, now: Date): DataPoint<T> {
  if (point.value === null || point.value === undefined) {
    return { ...point, value: null, status: "unavailable" };
  }

  const asOfTime = new Date(point.asOf).getTime();
  if (Number.isNaN(asOfTime)) {
    return { ...point, status: "unavailable" };
  }

  const ageHours = (now.getTime() - asOfTime) / (1000 * 60 * 60);
  if (ageHours > STALE_AFTER_HOURS) {
    return { ...point, status: "stale" };
  }

  return point;
}

function deepValidate(value: unknown, now: Date): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => deepValidate(item, now));
  }

  if (isDataPoint(value)) {
    return validatePoint(value, now);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepValidate(item, now)]));
  }

  return value;
}

export function getValidatedMorningBriefData(data: MorningBriefData): MorningBriefData {
  const validated = deepValidate(data, new Date()) as MorningBriefData;
  return {
    ...validated,
    lastRefreshed: new Date().toISOString()
  };
}
