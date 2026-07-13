"use client";

import { useMemo, useState } from "react";
import type { MorningBriefData } from "@/lib/types";
import {
  BtstIdeasCard,
  HeroBrief,
  IndexLevelsCard,
  KeyRisksCard,
  MacroCalendarCard,
  OptionsSetupCard,
  SectorRotationTable,
  SnapshotGrid,
  SwingOpportunitiesCard,
  TradingPlanCard
} from "./BriefSections";
import { Header } from "./Header";
import { MarketMoodGauge } from "./MarketMoodGauge";

function formatRefreshedTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata"
  }).format(new Date(value));
}

export function MorningBriefClient({ initialData }: { initialData: MorningBriefData }) {
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [mobile, setMobile] = useState("");
  const [alertStatus, setAlertStatus] = useState("");
  const data = initialData;

  const refreshedLabel = useMemo(() => formatRefreshedTime(data.lastRefreshed), [data.lastRefreshed]);

  const saveMobileAlert = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = mobile.trim();
    if (!/^[+()\-\s0-9]{8,20}$/.test(value)) {
      setAlertStatus("Enter a valid mobile number.");
      return;
    }
    localStorage.setItem("marketPulseMobileAlert", value);
    setAlertStatus("Mobile alerts enabled for this browser.");
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1560px] px-8 py-16 max-sm:px-4">
        <section id="today" className="mb-7 grid grid-cols-[minmax(0,1fr)_370px] items-center gap-12 max-xl:grid-cols-1">
          <HeroBrief page={data.page} refreshedLabel={refreshedLabel} />
          <MarketMoodGauge mood={data.moodIndex} />
        </section>

        <SnapshotGrid data={data} />

        <div className="mt-7">
          <SectorRotationTable sectors={data.sectors} />
        </div>

        <section id="ideas" className="mt-7 grid grid-cols-[1.15fr_.85fr_.9fr] gap-5 max-xl:grid-cols-1">
          <SwingOpportunitiesCard items={data.swingOpportunities} />
          <BtstIdeasCard items={data.btstIdeas} />
          <IndexLevelsCard levels={data.indexLevels} />
        </section>

        <section className="mt-7 grid grid-cols-[.9fr_1.15fr_.85fr] gap-5 max-xl:grid-cols-1">
          <OptionsSetupCard options={data.optionsSetup} />
          <MacroCalendarCard events={data.macroCalendar} />
          <KeyRisksCard risks={data.keyRisks} />
        </section>

        <div className="mt-7">
          <TradingPlanCard plan={data.tradingPlan} />
        </div>

        <section id="archive" className="mx-auto mt-24 flex max-w-[1180px] items-center justify-between gap-8 bg-pulse-deep px-14 py-11 text-white max-md:flex-col max-md:items-start max-md:px-7">
          <div>
            <h2 className="font-serif text-[42px] font-black leading-tight max-sm:text-4xl">{data.footer.ctaTitle.value}</h2>
            <p className="mt-3 text-lg font-semibold text-white/85">{data.footer.ctaSubtitle.value}</p>
          </div>
          <button className="min-w-56 bg-white px-7 py-5 text-lg font-black text-pulse-deep max-md:w-full" type="button" onClick={() => setAlertsOpen(true)}>
            Get mobile alerts
          </button>
        </section>

        <section className="mx-auto flex max-w-[1180px] items-center gap-8 border-t border-pulse-border py-9 max-md:flex-col max-md:items-start" aria-label="Sources">
          <strong className="text-sm font-black uppercase">Sources</strong>
          <div className="flex flex-wrap gap-8">
            {(data.footer.sources.value ?? []).map((item) => <a className="text-sm font-bold text-pulse-deep no-underline" href="#" key={item}>{item}</a>)}
          </div>
        </section>
      </main>

      <footer className="grid min-h-28 grid-cols-[auto_1fr_auto] items-center gap-9 border-t border-pulse-border px-16 max-md:grid-cols-1 max-md:px-6 max-md:py-8">
        <a className="flex items-center gap-4 font-serif text-2xl font-black text-pulse-ink no-underline" href="#">
          <span className="pulse-mark" aria-hidden="true" />
          <span>MARKET<span className="text-pulse-green">PULSE</span></span>
        </a>
        <p className="text-sm font-bold text-pulse-muted">{data.footer.disclaimer.value}</p>
        <span className="text-sm font-bold text-pulse-muted">{data.footer.copyright.value}</span>
      </footer>

      {alertsOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-5" onMouseDown={(event) => event.target === event.currentTarget && setAlertsOpen(false)}>
          <div className="relative w-full max-w-[430px] rounded-[7px] bg-white p-8 shadow-2xl">
            <button className="absolute right-4 top-3 text-3xl leading-none" type="button" aria-label="Close mobile alerts form" onClick={() => setAlertsOpen(false)}>&times;</button>
            <h2 className="font-serif text-3xl font-black">Get mobile alerts</h2>
            <p className="mt-3 leading-7 text-pulse-muted">Enter your mobile number and we will notify you when the morning brief is ready.</p>
            <form className="mt-5" onSubmit={saveMobileAlert}>
              <label className="mb-2 block text-xs font-black uppercase" htmlFor="mobileNumber">Mobile number</label>
              <input id="mobileNumber" className="w-full rounded border border-pulse-border px-4 py-3" value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="+91 98765 43210" inputMode="tel" autoComplete="tel" />
              <button className="mt-4 w-full rounded bg-pulse-green px-5 py-4 font-black text-white" type="submit">Save alert</button>
            </form>
            <p className="mt-3 min-h-6 font-bold text-pulse-green" role="status">{alertStatus}</p>
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-4 right-4 rounded bg-white px-3 py-2 text-xs font-bold text-pulse-muted shadow-soft">
        Last refreshed: {refreshedLabel}
      </div>
    </>
  );
}
