"use client";

const navItems = ["Today", "Markets", "Ideas", "Risk", "Archive"];

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-pulse-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[92px] max-w-[1440px] items-center justify-between px-8 max-lg:h-auto max-lg:flex-wrap max-lg:gap-4 max-lg:py-5">
        <a className="flex items-center gap-5 font-serif text-[32px] font-black leading-none text-pulse-ink no-underline max-sm:text-2xl" href="#">
          <span className="pulse-mark" aria-hidden="true" />
          <span>
            MARKET<span className="text-pulse-green">PULSE</span>
          </span>
        </a>
        <nav className="flex items-center gap-8 max-md:order-3 max-md:w-full max-md:overflow-x-auto" aria-label="Main navigation">
          {navItems.map((item, index) => (
            <a key={item} className={`whitespace-nowrap border-b-[3px] py-8 text-sm font-bold ${index === 0 ? "border-pulse-green text-pulse-green" : "border-transparent text-pulse-ink"}`} href={`#${item.toLowerCase()}`}>
              {item}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button className="rounded bg-pulse-green px-5 py-4 text-sm font-black text-white shadow-soft" type="button">
            Subscribe
          </button>
          <button className="grid h-12 w-12 place-items-center rounded-full border border-pulse-border bg-white" type="button" aria-label="User account">
            <svg className="h-5 w-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4.8 20c1.2-4.2 13.2-4.2 14.4 0" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
