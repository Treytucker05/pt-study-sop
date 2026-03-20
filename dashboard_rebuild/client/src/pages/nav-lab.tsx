import type { CSSProperties, ReactNode } from "react";

import navShellBackground from "@assets/Dashboard finished.png";
import logoImg from "@assets/StudyBrainIMAGE_1768640444498.jpg";

type TitleVariant = {
  id: string;
  name: string;
  fontLabel: string;
  summary: string;
  recommendation?: string;
  renderLockup: () => ReactNode;
};

function BrainChip({
  className = "h-14 w-14",
  imgClassName = "h-9 w-9",
}: {
  className?: string;
  imgClassName?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-red-500/60 bg-[radial-gradient(circle_at_35%_35%,rgba(255,255,255,0.2),rgba(10,0,0,0.88)_72%)] shadow-[0_0_22px_rgba(255,78,78,0.32),0_14px_30px_rgba(0,0,0,0.48)] ${className}`}
    >
      <img
        src={logoImg}
        alt=""
        aria-hidden="true"
        className={`rounded-full object-cover grayscale-[0.08] saturate-[1.14] ${imgClassName}`}
      />
    </span>
  );
}

function Wordmark({
  fontFamily,
  className = "",
  style,
}: {
  fontFamily: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`uppercase leading-none text-[#fff4ed] [text-shadow:0_0_18px_rgba(255,120,120,0.68),0_0_38px_rgba(255,82,82,0.28),0_5px_0_rgba(28,8,8,0.98)] ${className}`}
      style={{
        fontFamily,
        ...style,
      }}
    >
      TREY&apos;S STUDY SYSTEM
    </span>
  );
}

function PreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-[22rem] overflow-hidden rounded-[1.5rem] border border-red-500/18 bg-[linear-gradient(180deg,rgba(15,0,0,0.96),rgba(5,0,0,0.98))] shadow-[0_20px_56px_rgba(0,0,0,0.52)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(220,38,38,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(220,38,38,0.06)_1px,transparent_1px)] bg-[size:20px_20px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,86,86,0.15),transparent_18%),linear-gradient(180deg,rgba(0,0,0,0.2),rgba(0,0,0,0.56)_48%,rgba(0,0,0,0.86)_100%)]" />
      <div className="absolute inset-x-0 bottom-[-6%] h-[68%]">
        <img
          src={navShellBackground}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[50%_64%] opacity-[0.94]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.22)_20%,rgba(0,0,0,0.48)_100%)]" />
      </div>
      <div className="relative h-full w-full">{children}</div>
    </div>
  );
}

const TITLE_VARIANTS: TitleVariant[] = [
  {
    id: "oxanium-balanced",
    name: "Balanced Bookends",
    fontLabel: "Oxanium",
    recommendation: "Best overall fit: strongest hierarchy, one clean line, and the least visual drift against the shell.",
    summary:
      "A one-line lockup with equal bookend chips and a single shared glow plane. This is the most stable version for the live navbar.",
    renderLockup: () => (
      <div className="absolute left-[4.8%] top-[1.25rem] flex items-center gap-4">
        <div className="pointer-events-none absolute left-[3.8rem] top-1/2 h-[4.5rem] w-[42rem] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,86,86,0.46),transparent_72%)] blur-3xl" />
        <BrainChip className="relative z-10 h-[5.3rem] w-[5.3rem]" imgClassName="h-[3.4rem] w-[3.4rem]" />
        <Wordmark
          fontFamily="var(--font-oxanium)"
          className="relative z-10"
          style={{
            fontWeight: 700,
            fontSize: "clamp(2.2rem,3.25vw,3rem)",
            letterSpacing: "0.12em",
          }}
        />
        <BrainChip className="relative z-10 h-[5.3rem] w-[5.3rem]" imgClassName="h-[3.4rem] w-[3.4rem]" />
      </div>
    ),
  },
  {
    id: "orbitron-command",
    name: "Command Rail",
    fontLabel: "Orbitron",
    summary:
      "A more mechanical title lane with the wordmark mounted into a translucent rail. This feels more tactical and system-like.",
    renderLockup: () => (
      <div className="absolute left-[3.8%] top-[1rem] flex items-center gap-3">
        <BrainChip className="relative z-10 h-[5.05rem] w-[5.05rem]" imgClassName="h-[3.15rem] w-[3.15rem]" />
        <div className="relative rounded-[1.8rem] border border-red-400/35 bg-[linear-gradient(180deg,rgba(28,0,0,0.82),rgba(12,0,0,0.96))] px-5 py-3 shadow-[0_0_20px_rgba(255,92,92,0.22),0_14px_28px_rgba(0,0,0,0.45)]">
          <div className="pointer-events-none absolute inset-x-6 top-1/2 h-[3.75rem] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,86,86,0.26),transparent_72%)] blur-2xl" />
          <Wordmark
            fontFamily="var(--font-orbitron)"
            className="relative z-10"
            style={{
              fontWeight: 800,
              fontSize: "clamp(1.95rem,3.05vw,2.62rem)",
              letterSpacing: "0.14em",
            }}
          />
        </div>
        <BrainChip className="relative z-10 h-[5.05rem] w-[5.05rem]" imgClassName="h-[3.15rem] w-[3.15rem]" />
      </div>
    ),
  },
  {
    id: "audiowide-signal",
    name: "Signal Banner",
    fontLabel: "Audiowide",
    summary:
      "A softer sci-fi treatment with rounder forms and more breathing room. It feels more neon and less militarized than the other two.",
    renderLockup: () => (
      <div className="absolute left-[4.6%] top-[1.5rem] flex items-center gap-5">
        <BrainChip className="relative z-10 h-[4.8rem] w-[4.8rem]" imgClassName="h-[3rem] w-[3rem]" />
        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[4.1rem] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,106,106,0.36),transparent_72%)] blur-3xl" />
          <Wordmark
            fontFamily="var(--font-audiowide)"
            className="relative z-10"
            style={{
              fontSize: "clamp(1.95rem,3.1vw,2.72rem)",
              letterSpacing: "0.09em",
            }}
          />
        </div>
        <BrainChip className="relative z-10 h-[4.8rem] w-[4.8rem]" imgClassName="h-[3rem] w-[3rem]" />
      </div>
    ),
  },
];

function VariantCard({ variant }: { variant: TitleVariant }) {
  return (
    <section className="overflow-hidden rounded-[1.8rem] border border-red-500/20 bg-black/45 shadow-[0_18px_56px_rgba(0,0,0,0.42)]">
      <div className="border-b border-red-500/18 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-terminal text-[0.72rem] uppercase tracking-[0.3em] text-red-300/72">
              {variant.fontLabel}
            </div>
            <h2 className="mt-1 font-arcade text-base leading-tight text-[#fff4ed] sm:text-lg">
              {variant.name}
            </h2>
          </div>
          {variant.recommendation ? (
            <div className="rounded-full border border-emerald-400/35 bg-emerald-400/10 px-3 py-1 font-terminal text-[0.68rem] uppercase tracking-[0.22em] text-emerald-200">
              Recommended
            </div>
          ) : null}
        </div>
        <p className="mt-3 max-w-3xl font-terminal text-sm leading-6 text-red-100/76">
          {variant.summary}
        </p>
      </div>

      <div className="p-4 sm:p-5">
        <PreviewFrame>{variant.renderLockup()}</PreviewFrame>
      </div>
    </section>
  );
}

export default function NavLabPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#120000_0%,#050000_100%)] text-[#fff4ed]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-[1.8rem] border border-red-500/20 bg-black/55 p-6 shadow-[0_22px_60px_rgba(0,0,0,0.48)] backdrop-blur-md">
          <div className="font-terminal text-[0.74rem] uppercase tracking-[0.34em] text-red-300/74">
            Title Lockup Lab
          </div>
          <h1 className="mt-3 max-w-5xl font-arcade text-2xl leading-tight text-[#fff4ed] sm:text-3xl">
            Compare three live title directions before we touch the real header again.
          </h1>
          <p className="mt-4 max-w-4xl font-terminal text-sm leading-7 text-red-100/78 sm:text-[0.95rem]">
            These variants follow the same basic rule set from the research: one dominant title line, two matched brain
            bookends, and one shared glow plane so the lockup reads as a unit instead of separate ornaments.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="/brain"
              className="inline-flex items-center rounded-full border border-red-500/35 bg-red-500/10 px-4 py-2 font-terminal text-xs uppercase tracking-[0.24em] text-red-100 transition hover:border-red-400/60 hover:bg-red-500/16"
            >
              Back To Brain
            </a>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {TITLE_VARIANTS.map((variant) => (
            <VariantCard key={variant.id} variant={variant} />
          ))}
        </div>
      </div>
    </div>
  );
}
