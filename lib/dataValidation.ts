import type { DataPoint, MorningBriefData } from "./types";
import { morningBriefData } from "./morningBriefData";

const STALE_AFTER_HOURS = 48;

function isDataPoint(value: unknown): value is DataPoint<unknown> {
  return Boolean(value && typeof value === "object" && "status" in value && "source" in value && "asOf" in value);
}

function isDataPointShape(value: unknown): value is DataPoint<unknown> {
  return Boolean(value && typeof value === "object" && "value" in value && "status" in value && "source" in value && "asOf" in value);
}

function markUnavailable<T>(point: DataPoint<T>, now: Date): DataPoint<T> {
  return {
    ...point,
    value: null,
    change: null,
    changePercent: null,
    status: "unavailable",
    source: "Data unavailable",
    asOf: now.toISOString()
  };
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

function coerceToTemplateShape(template: unknown, value: unknown, now: Date): unknown {
  if (isDataPointShape(template)) {
    if (!isDataPoint(value)) {
      return markUnavailable(template, now);
    }

    const merged = {
      ...template,
      ...value,
      change: typeof value.change === "number" ? value.change : null,
      changePercent: typeof value.changePercent === "number" ? value.changePercent : null
    } as DataPoint<unknown>;

    if (Array.isArray(template.value) && !Array.isArray(merged.value)) {
      return markUnavailable(template, now);
    }

    return validatePoint(merged, now);
  }

  if (Array.isArray(template)) {
    if (!Array.isArray(value)) {
      return template;
    }

    if (template.length === 0) {
      return value;
    }

    return value.map((item, index) => coerceToTemplateShape(template[Math.min(index, template.length - 1)], item, now));
  }

  if (template && typeof template === "object") {
    const candidate = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return Object.fromEntries(
      Object.entries(template).map(([key, templateValue]) => [
        key,
        coerceToTemplateShape(templateValue, candidate[key], now)
      ])
    );
  }

  return value ?? template;
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
  const now = new Date();
  const shapeSafeData = coerceToTemplateShape(morningBriefData, data, now);
  const validated = deepValidate(shapeSafeData, now) as MorningBriefData;
  return {
    ...validated,
    lastRefreshed: validated.lastRefreshed || data.lastRefreshed || now.toISOString()
  };
}
