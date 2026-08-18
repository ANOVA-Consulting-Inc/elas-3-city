import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitParticipation, lookupParticipant } from "@/lib/participations.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ELAS-3-CITY — EOI / Community Value Circulation" },
      {
        name: "description",
        content:
          "ELAS-3-CITY — a community-centered sustainability intelligence, participation and value-circulation platform proposed for prospective municipal and institutional partners.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Index,
});

const REF = "ELAS-3-CITY / EOI / ANOVA / AUG-2026 / v1.0";

const PUBLIC_TOC = [
  { id: "overview", num: "I", label: "Executive Summary" },
  { id: "context", num: "II", label: "Sustainability & Community Context" },
  { id: "whythis", num: "III", label: "Why This Matters Now" },
];

const PROTECTED_TOC = [
  { id: "model", num: "IV", label: "The ELAS-3-CITY Model" },
  { id: "layers", num: "V", label: "Four-Part Platform Ecosystem" },
  { id: "value", num: "VI", label: "Value-Creation Framework" },
  { id: "ecosystems", num: "VII", label: "Ecosystem-Service Tracking" },
  { id: "financing", num: "VIII", label: "Financing & Value Circulation" },
  { id: "governance", num: "IX", label: "Governance & Safeguards" },
  { id: "roadmap", num: "X", label: "Delivery Roadmap" },
];

const TOC = [...PUBLIC_TOC, ...PROTECTED_TOC];

type Stage = "email" | "public" | "signed";

function Index() {
  const navigate = useNavigate();
  const [ackOpen, setAckOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [gdprOpen, setGdprOpen] = useState(false);
  const [ack, setAck] = useState<{ name: string; email: string } | null>(null);
  const [banner, setBanner] = useState(true);
  const [stage, setStage] = useState<Stage>("email");
  const [knownEmail, setKnownEmail] = useState("");
  const [knownName, setKnownName] = useState("");
  const [seenGated, setSeenGated] = useState<Set<string>>(new Set());
  const submit = useServerFn(submitParticipation);
  const lookup = useServerFn(lookupParticipant);

  const markSeen = useCallback((id: string) => {
    setSeenGated((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);
  const allGatedSeen = seenGated.size >= PROTECTED_TOC.length;

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setAck(null);
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onBlur = () => document.body.classList.add("window-blurred");
    const onFocus = () => document.body.classList.remove("window-blurred");
    const onVisibility = () => {
      if (document.visibilityState === "hidden") document.body.classList.add("window-blurred");
      else document.body.classList.remove("window-blurred");
    };
    const onBeforePrint = () => document.body.classList.add("window-blurred");
    const onAfterPrint = () => document.body.classList.remove("window-blurred");
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      document.body.classList.remove("window-blurred");
    };
  }, []);

  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (e.key === "PrintScreen") {
        document.body.classList.add("window-blurred");
        window.setTimeout(() => document.body.classList.remove("window-blurred"), 1500);
        e.preventDefault();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "v", "p", "s", "a"].includes(k)) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", stop);
    document.addEventListener("copy", stop);
    document.addEventListener("cut", stop);
    document.addEventListener("paste", stop);
    document.addEventListener("selectstart", stop);
    document.addEventListener("dragstart", stop);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("contextmenu", stop);
      document.removeEventListener("copy", stop);
      document.removeEventListener("cut", stop);
      document.removeEventListener("paste", stop);
      document.removeEventListener("selectstart", stop);
      document.removeEventListener("dragstart", stop);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleEmailResolved = useCallback(
    async (email: string) => {
      const trimmed = email.trim();
      try {
        const res = await lookup({ data: { email: trimmed } });
        setKnownEmail(trimmed);
        if (res.name) setKnownName(res.name);
        if (res.found) {
          setAck({ name: res.name ?? "Authorized Reader", email: trimmed });
          setStage("signed");
        } else {
          setStage("public");
        }
      } catch (err) {
        console.error("[lookupParticipant] failed", err);
        setKnownEmail(trimmed);
        setStage("public");
      }
    },
    [lookup],
  );

  const enterPlatform = useCallback(() => {
    navigate({ to: "/admin" });
  }, [navigate]);

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-background text-ink [overflow-anchor:none]">
      {/* ANOVA watermark — fixed behind all content */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[url('/anova-watermark.png')] bg-center bg-no-repeat opacity-[0.15]"
        style={{
          backgroundSize: "min(80vw, 500px)",
          backgroundPosition: "center center",
        }}
      />

      <div className="relative z-10">
        <TopRibbon />
      <MetaBar />

      <main
        className={`protect-blur no-select select-none w-full max-w-full overflow-x-hidden ${
          banner ? "pb-32 sm:pb-28" : ""
        }`}
      >
        <Hero />
        <TableOfContents onRequestGated={() => setAckOpen(true)} ack={stage === "signed"} />
        <SectionExecutive />
        <SectionContext />
        <SectionWhyNow />
        {stage === "signed" && <GatedSections onSectionSeen={markSeen} />}
        {stage === "public" && <AcknowledgeCTA onClick={() => setAckOpen(true)} />}
        {stage === "signed" && (
          <EnterPlatformCTA
            enabled={allGatedSeen}
            seenCount={seenGated.size}
            totalCount={PROTECTED_TOC.length}
            onEnter={enterPlatform}
          />
        )}
        <FootnotesBlock ack={stage === "signed"} />
        <Colophon
          ack={stage === "signed"}
          onPrivacy={() => setPrivacyOpen(true)}
          onGdpr={() => setGdprOpen(true)}
        />
      </main>

      {stage === "email" && <EmailGate onResolved={handleEmailResolved} />}

      {ackOpen && (
        <AckDialog
          defaultEmail={knownEmail}
          defaultName={knownName}
          onClose={() => setAckOpen(false)}
          onSubmit={async (v) => {
            try {
              await submit({ data: { ...v, ref: REF } });
              setAck({ name: v.name, email: v.email });
              setKnownEmail(v.email);
              setKnownName(v.name);
              setStage("signed");
              setAckOpen(false);
            } catch (e) {
              console.error("[submitParticipation] failed", e);
              throw e;
            }
          }}
          onPrivacy={() => setPrivacyOpen(true)}
        />
      )}
      {banner && stage !== "email" && (
        <ConfidentialityBanner
          alreadySigned={stage === "signed"}
          onDismiss={() => setBanner(false)}
          onAck={() => {
            setBanner(false);
            setAckOpen(true);
          }}
          onPrivacy={() => setPrivacyOpen(true)}
          onGdpr={() => setGdprOpen(true)}
        />
      )}
      {privacyOpen && <PolicyDialog kind="privacy" onClose={() => setPrivacyOpen(false)} />}
      {gdprOpen && <PolicyDialog kind="gdpr" onClose={() => setGdprOpen(false)} />}
      </div>
    </div>
  );
}

function EmailGate({ onResolved }: { onResolved: (email: string) => Promise<void> | void }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = /.+@.+\..+/.test(email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onResolved(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify email.");
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="eoi-gate-title"
      className="fixed inset-0 z-[100] grid place-items-center bg-background/95 backdrop-blur-sm px-4"
    >
      <div className="w-full max-w-md border border-rule bg-surface p-6 sm:p-8 shadow-xl">
        <div className="micro text-classified">CONFIDENTIAL · NAMED RECIPIENTS ONLY</div>
        <h2
          id="eoi-gate-title"
          className="text-display mt-3 text-[28px] sm:text-[36px] leading-tight"
        >
          Identify yourself
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
          This dossier is circulated to a limited set of named recipients. Enter the email address
          this EOI was sent to in order to continue.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="eoi-gate-email" className="micro mb-2 block">
              Email
            </label>
            <input
              id="eoi-gate-email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organisation.tld"
              className="w-full border border-rule bg-background px-3 py-2 font-mono text-[13px] text-ink focus:border-accent focus:outline-none"
              required
            />
          </div>
          {error && (
            <div className="border border-classified/40 bg-classified/10 px-3 py-2 font-mono text-[11px] text-classified">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={!valid || submitting}
            className="w-full border border-accent bg-accent px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-accent-foreground transition-opacity hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Verifying…" : "Continue"}
          </button>
        </form>
        <p className="mt-6 font-mono text-[10px] leading-relaxed text-ink-faint">
          Your email is used only to look up whether you have already signed the NDA for this
          dossier. No tracking, analytics or cookies are set.
        </p>
      </div>
    </div>
  );
}

function AcknowledgeCTA({ onClick }: { onClick: () => void }) {
  return (
    <section className="border-b border-rule bg-surface/40">
      <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-5 md:px-10 md:py-24 text-center">
        <div className="micro text-classified">SECTIONS IV — X · RESTRICTED</div>
        <h2 className="text-display mt-4 text-[28px] sm:text-[40px] md:text-[52px] leading-tight">
          Ready to read the restricted sections?
        </h2>
        <p className="mx-auto mt-5 max-w-[60ch] text-[14px] leading-relaxed text-ink-muted">
          Sections IV through X (Model, Ecosystem, Value Framework, Env. Services, Financing,
          Governance and Roadmap) are bound by a Non-Disclosure Agreement. Print and sign — or sign
          on-screen — to unlock the rest of the dossier and gain access to the ELAS-3-CITY platform.
        </p>
        <button
          onClick={onClick}
          className="mt-8 inline-flex items-center gap-3 border border-accent bg-accent px-6 py-3 font-mono text-[12px] uppercase tracking-[0.22em] text-accent-foreground transition-opacity hover:bg-accent/90"
        >
          Acknowledge & Continue
          <span aria-hidden>→</span>
        </button>
      </div>
    </section>
  );
}

function EnterPlatformCTA({
  enabled,
  seenCount,
  totalCount,
  onEnter,
}: {
  enabled: boolean;
  seenCount: number;
  totalCount: number;
  onEnter: () => void;
}) {
  return (
    <section className="border-b border-rule bg-surface/40">
      <div className="mx-auto max-w-[1100px] px-4 py-16 sm:px-5 md:px-10 md:py-24 text-center">
        <div className={`micro ${enabled ? "text-accent" : "text-classified"}`}>
          {enabled ? "CLEARANCE GRANTED" : "READING IN PROGRESS"}
        </div>
        <h2 className="text-display mt-4 text-[28px] sm:text-[40px] md:text-[52px] leading-tight">
          {enabled ? "You're cleared." : "Almost there."}
        </h2>
        <p className="mx-auto mt-5 max-w-[60ch] text-[14px] leading-relaxed text-ink-muted">
          {enabled
            ? "You've reviewed every restricted section. Step into the ELAS-3-CITY platform to continue."
            : `Scroll through sections IV–X to unlock the platform. (${seenCount} of ${totalCount} reviewed.)`}
        </p>
        <button
          onClick={onEnter}
          disabled={!enabled}
          className="mt-8 inline-flex items-center gap-3 border border-accent bg-accent px-6 py-3 font-mono text-[12px] uppercase tracking-[0.22em] text-accent-foreground transition-opacity hover:bg-accent/90 disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-muted disabled:border-rule"
        >
          {enabled ? "Enter the Platform" : "Locked — keep scrolling"}
          <span aria-hidden>{enabled ? "→" : "✕"}</span>
        </button>
        <div className="mx-auto mt-6 h-[3px] w-full max-w-xs bg-rule/50">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${Math.min(100, (seenCount / totalCount) * 100)}%` }}
          />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────── chrome ── */

function TopRibbon() {
  const items = [
    "CONFIDENTIAL CIRCULATION",
    "PREPARED FOR PROSPECTIVE MUNICIPAL & INSTITUTIONAL PARTNERS",
    "NOT FOR PUBLIC DISTRIBUTION",
    REF,
    "CONFIDENTIAL — NAMED RECIPIENTS ONLY",
  ];
  const line = items.join("  ·  ");
  return (
    <div className="relative overflow-hidden border-b border-rule bg-surface">
      <div className="ribbon-stripe h-[3px] w-full" />
      <div className="py-2 sm:hidden">
        <div className="micro px-4 text-classified">CONFIDENTIAL · CIRCULATION</div>
      </div>
      <div className="hidden overflow-hidden whitespace-nowrap py-2 sm:block">
        <div className="ticker-track inline-flex micro text-classified">
          <span className="px-8">{line}</span>
          <span className="px-8">{line}</span>
          <span className="px-8">{line}</span>
          <span className="px-8">{line}</span>
        </div>
      </div>
      <div className="ribbon-stripe h-[3px] w-full" />
    </div>
  );
}

function MetaBar() {
  return (
    <div className="border-b border-rule bg-background/60 backdrop-blur">
      <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)] gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5 md:px-10">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <SealMark />
          <div className="min-w-0 leading-tight">
            <div className="font-mono text-[11px] tracking-[0.12em] text-ink-muted sm:tracking-[0.22em]">
              ELAS-3-CITY ⁄ ANOVA
            </div>
            <div className="mt-1 max-w-full break-words font-mono text-[9.5px] leading-snug tracking-[0.04em] text-ink-faint [overflow-wrap:anywhere] sm:mt-0 sm:text-[10px] sm:tracking-[0.18em]">
              DOSSIER · {REF}
            </div>
          </div>
        </div>
        <nav className="hidden items-center gap-6 md:flex">
          {["EL", "LAS", "3", "CITY"].map((t) => (
            <span key={t} className="micro hover:text-accent transition-colors cursor-default">
              {t}
            </span>
          ))}
        </nav>
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:justify-end sm:gap-3">
          <span className="micro hidden sm:inline">AUG 2026</span>
          <span className="stamp px-2 text-[9px] sm:px-[10px] sm:text-[10px]">RESTRICTED</span>
        </div>
      </div>
    </div>
  );
}

function SealMark() {
  return (
    <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-sm border border-accent/60 bg-accent/10">
      <span className="font-serif text-xl italic text-accent">E3</span>
      <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-classified" />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative border-b border-rule">
      <div className="perf-grid absolute inset-0 opacity-[0.18]" aria-hidden />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-4 py-12 sm:px-5 md:grid-cols-12 md:px-10 md:py-32">
        <div className="min-w-0 md:col-span-2">
          <div className="space-y-3">
            <div className="micro">FILE</div>
            <div className="font-mono text-[11px] text-ink">{REF}</div>
            <div className="hairline pt-3 micro">VOLUME</div>
            <div className="font-mono text-[11px] text-ink">01 / 01</div>
            <div className="hairline pt-3 micro">PAGES</div>
            <div className="font-mono text-[11px] text-ink">10</div>
          </div>
        </div>

        <div className="min-w-0 md:col-span-8">
          <div className="micro mb-6">EXPRESSION OF INTEREST · RESTRICTED CIRCULATION</div>
          <h1 className="text-display text-[56px] leading-[0.88] sm:text-[88px] md:text-[168px]">
            ELAS<span className="italic text-accent">-3-</span>CITY
          </h1>
          <p className="mt-6 max-w-[58ch] font-serif text-[18px] italic leading-snug text-ink-muted sm:text-[22px] md:text-[26px]">
            Elasticity, tokenization, and the three facets of supply chain, compute and energy — a
            governed sustainability and community-value platform.
          </p>
          <p className="mt-8 max-w-[72ch] text-[15px] leading-relaxed text-ink-muted [overflow-wrap:anywhere]">
            ELAS-3-CITY is a community-centered sustainability intelligence, participation and
            value-circulation platform proposed by ANOVA Consulting Inc. for governments,
            municipalities, businesses, organizations, community pods and DAOs that seek to measure,
            verify, manage and share sustainability savings across supply chain, compute and energy
            systems. This Expression of Interest is intended to support discussion, co-design and a
            possible working arrangement.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-5 border-t border-rule pt-8 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
            <Meta k="Reference" v={REF} />
            <Meta k="Date" v="August 2026" />
            <Meta k="Status" v="EOI — For Consideration" />
            <Meta k="Classification" v="Restricted · Confidential" />
            <Meta k="Prepared For" v="Prospective Municipal & Institutional Partners" />
            <Meta k="Circulation" v="Limited — Named Recipients Only" />
            <Meta k="Author" v="ANOVA / ELAS-3-CITY" />
            <Meta k="Revision" v="v1.0" />
          </div>
        </div>

        <div className="min-w-0 md:col-span-2 md:text-right">
          <div className="inline-block stamp text-[11px]">CONFIDENTIAL</div>
          <div className="mt-6 micro">Verifier</div>
          <div className="mt-1 font-mono text-[11px] text-ink-muted">sha256:auto</div>
        </div>
      </div>

      <div className="border-t border-rule">
        <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 sm:flex sm:justify-between md:px-10">
          <span className="micro min-w-0 truncate">SCROLL TO REVIEW PROPOSAL</span>
          <span className="shrink-0 font-mono text-xs text-accent">↓</span>
          <span className="micro hidden md:inline">NODE_01 / OVERVIEW</span>
        </div>
      </div>
    </section>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <div className="micro">{k}</div>
      <div className="mt-1 font-mono text-[12px] leading-snug text-ink break-words [overflow-wrap:anywhere]">
        {v}
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-rule bg-background/40 px-3 py-2">
      <span className="micro">{label}</span>
      <span className="font-mono text-[11px] text-ink-muted break-words [overflow-wrap:anywhere]">
        {value}
      </span>
    </div>
  );
}

function NodeHeader({ num, title, id }: { num: string; title: string; id: string }) {
  return (
    <header id={id} className="min-w-0 border-b border-rule pb-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4">
        <span className="micro min-w-0 truncate">NODE · SECTION {num}</span>
        <span className="micro shrink-0">§ {num}</span>
      </div>
      <h2 className="text-display mt-4 break-words text-[30px] sm:text-[44px] md:text-[64px]">
        <span className="text-ink-faint mr-2 sm:mr-4 font-mono text-[20px] sm:text-[28px] md:text-[36px]">
          {num}.
        </span>
        {title}
      </h2>
    </header>
  );
}

function StatCard({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="min-w-0 rounded-md border border-rule bg-background/40 px-4 py-3">
      <div className="text-[28px] font-bold text-accent">{v}</div>
      <div className="micro mt-1">{k}</div>
      {sub && (
        <div className="font-mono text-[10.5px] text-ink-muted break-words [overflow-wrap:anywhere]">
          {sub}
        </div>
      )}
    </div>
  );
}

function Sup({ n }: { n: string }) {
  return (
    <sup
      className="align-super font-mono text-[9px] text-ink-muted underline decoration-1 underline-offset-[1px]"
      title={`Footnote ${n}`}
    >
      [{n}]
    </sup>
  );
}

function TableOfContents({ onRequestGated, ack }: { onRequestGated: () => void; ack: boolean }) {
  const items = [...PUBLIC_TOC, ...PROTECTED_TOC];
  return (
    <aside className="border-b border-rule">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-5 md:px-10">
        <div className="micro text-classified mb-3">{ack ? "DECLASSIFIED" : "CLASSIFIED"}</div>
        <nav className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
          {items.map((it) => (
            <a
              key={it.id}
              href={`#${it.id}`}
              className="group micro flex min-w-0 items-center gap-2 font-mono text-[11px] text-ink-muted hover:text-accent"
            >
              <span className="text-ink-faint group-hover:text-accent">§{it.num}</span>
              <span className="min-w-0 truncate">{it.label}</span>
            </a>
          ))}
          {!ack && (
            <button
              onClick={onRequestGated}
              className="micro justify-start font-mono text-[11px] text-accent underline underline-offset-2 hover:text-accent/80"
            >
              § IV — Sign to unlock →
            </button>
          )}
        </nav>
      </div>
    </aside>
  );
}

function SectionExecutive() {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-5 md:px-10 md:py-32">
        <NodeHeader num="I" title="Executive Summary" id="overview" />
        <div className="mt-12 grid min-w-0 grid-cols-1 gap-12 md:grid-cols-12">
          <aside className="min-w-0 md:col-span-3">
            <div className="sticky top-8 space-y-6">
              <Pill label="Theme" value="Sustainability & community value" />
              <Pill label="Posture" value="Community-first digital infrastructure" />
              <Pill label="Scope" value="Supply chain · Compute · Energy" />
              <Pill label="Audience" value="Municipality · Business · Community" />
              <blockquote className="border-l-2 border-accent pl-4 font-serif text-[18px] italic leading-snug text-ink-muted">
                "A memory, a referee, and a witness for sustainable community value."
              </blockquote>
            </div>
          </aside>
          <article className="min-w-0 space-y-8 md:col-span-9">
            <DropCapP first="E">
              LAS-3-CITY derives its name from three linked ideas — Elasticity, Web3 tokenization,
              and the Tri facets of supply chain, compute and energy. It is proposed as a
              community-centered sustainability intelligence, participation and value-circulation
              platform that helps governments, businesses, organizations, community pods and DAOs
              identify, verify, manage and share sustainability savings.
            </DropCapP>
            <p className="text-[17px] leading-[1.75] text-ink-muted">
              The proposed model integrates greenhouse-gas accounting perspectives, lifecycle and
              sustainable-consumption-and-production (SCP) practices, ecosystem-service tracking,
              environmental and financial savings analysis, community participation, utility
              provisioning, and token-ready recognition and redemption mechanisms.
            </p>
            <p className="text-[17px] leading-[1.75] text-ink-muted">
              ELAS-3-CITY is aligned with SDG 9 (Industry, Innovation and Infrastructure), SDG 11
              (Sustainable Cities and Communities), and SDG 12 (Responsible Consumption and
              Production), and is informed by the United Nations 10-Year Framework of Programs on
              Sustainable Consumption and Production Patterns.
            </p>
            <div className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-3">
              <StatCard k="Facets" v="3" sub="Supply chain · Compute · Energy" />
              <StatCard k="Value forms" v="3" sub="Savings · Utility · Engagements" />
              <StatCard k="Ecosystem scaffolds" v="8" sub="Community · Soil · Water · Climate..." />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function SectionContext() {
  return (
    <section className="border-b border-rule bg-surface/40">
      <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-5 md:px-10 md:py-32">
        <NodeHeader num="II" title="Sustainability & Community Context" id="context" />
        <div className="mt-12 grid gap-10 md:grid-cols-2">
          <article className="space-y-5 text-[16px] leading-[1.8] text-ink-muted">
            <h3 className="font-serif text-[22px] text-ink">
              Communities face connected pressures
            </h3>
            <p>
              Governments, organizations and communities face connected pressures: energy costs,
              resource scarcity, infrastructure constraints, climate exposure, supply-chain
              inefficiency, environmental degradation, waste, emissions, and uneven access to the
              benefits created by sustainability investments.
            </p>
            <p>
              Sustainability activity is often fragmented. A business may pursue energy efficiency
              without linking savings to its supply chain, its products' end of life, community
              benefits or ecosystem effects. A community initiative may generate participation and
              local knowledge without a durable means of recording contributions, recognizing value
              or sharing benefits. Public institutions may have policy objectives and datasets, yet
              lack a common operational layer that connects projects, measured outcomes,
              participating organizations and end users.
            </p>
            <p>
              ELAS-3-CITY is proposed as a practical digital operating model through which the
              principles of the United Nations 10YFP — lifecycle approaches and sustainable supply
              chains — can be applied locally, organizationally and across community ecosystems.
            </p>
          </article>
          <div className="space-y-4">
            <PrincipleRow n="01" t="Elasticity first">
              Adaptive response to resource constraints and incentives.
            </PrincipleRow>
            <PrincipleRow n="02" t="Lifecycle approach">
              Products, services, facilities, operations and end-of-life.
            </PrincipleRow>
            <PrincipleRow n="03" t="Value beyond cash">
              Measure environmental, social and utility value, not only finance.
            </PrincipleRow>
            <PrincipleRow n="04" t="Transparency first">
              Governed, auditable recognition and circulation of verified value.
            </PrincipleRow>
            <PrincipleRow n="05" t="Community-owned benefits">
              Value circulates back to the people and communities that help create it.
            </PrincipleRow>
            <div className="mt-8 border border-rule bg-surface p-6">
              <h3 className="font-serif text-[22px] text-ink mb-3">What is ELAS-3-CITY?</h3>
              <p className="text-[14px] leading-[1.75] text-ink-muted">
                ELAS-3-CITY is a sustainability and ecosystem-value platform that supports the
                measurement and management of savings, utility and engagement outcomes across an
                interconnected participant ecosystem — across supply chain, compute and energy.
              </p>
              <p className="mt-3 text-[14px] leading-[1.75] text-ink-muted">
                The detailed proposed capabilities, operating model, control architecture and
                implementation requirements are restricted to the signed-recipient section of this
                dossier. ELAS-3-CITY is therefore introduced here only at concept level.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionWhyNow() {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-5 md:px-10 md:py-32">
        <NodeHeader num="III" title="Why This Matters Now" id="whythis" />
        <div className="mt-12 max-w-[80ch] space-y-5 text-[16px] leading-[1.8] text-ink-muted">
          <p>
            Governments and communities are under growing pressure to deliver measurable
            environmental and social outcomes while keeping costs and resource use under control. At
            the same time, sustainability investments often fail to link their benefits back to the
            people and places that help produce them.
          </p>
          <p>
            ELAS-3-CITY matters because it offers a governed, evidence-based environment in which
            businesses, public institutions, infrastructure operators, communities and consumers can
            work from a shared model of environmental, financial, ecosystem and social value — and
            circulate a portion of that value back to contributors.
          </p>
          <p>
            This proposal is timely as local partners define policy priorities, target sectors,
            community areas and sustainability outcomes that require an operational layer connecting
            projects, measured outcomes, participating organizations and end users.
          </p>
        </div>
      </div>
    </section>
  );
}

function GatedSections({ onSectionSeen }: { onSectionSeen: (id: string) => void }) {
  return (
    <>
      <GatedHeader num="IV" title="The ELAS-3-CITY Model" id="model" onSeen={onSectionSeen} />
      <section className="border-b border-rule bg-surface/40">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-5 md:px-10 md:py-32">
          <NodeHeader num="IV" title="The ELAS-3-CITY Model" id="model" />
          <div className="mt-12 grid min-w-0 grid-cols-1 gap-12 md:grid-cols-12">
            <aside className="min-w-0 md:col-span-5">
              <Pill
                label="Elasticity"
                value="Adaptive response to constraints, incentives & opportunity"
              />
              <Pill
                label="Tokenization"
                value="Recognition & circulation of verified ecosystem, social & financial value"
              />
              <Pill label="Tri facets" value="Supply chain · Compute · Energy" />
              <blockquote className="border-l-2 border-accent pl-4 font-serif text-[18px] italic leading-snug text-ink-muted">
                "Sustainability savings can be measured responsibly, converted into practical
                utility, and circulated back to contributors."
              </blockquote>
            </aside>
            <article className="min-w-0 space-y-5 text-[16px] leading-[1.8] text-ink-muted md:col-span-7">
              <p>
                ELAS-3-CITY is proposed as a modular sustainability and ecosystem-value platform
                that supports the measurement and management of savings, utility and engagements
                across an interconnected participant ecosystem. Each facet — supply chain, compute
                resources, and energy grid/resources — may be assessed through the Greenhouse Gas
                Protocol perspectives: Scope 1, Scope 2, Scope 3a and Scope 3b.
              </p>
              <p>
                The platform is designed as coordinated digital infrastructure rather than a
                single-purpose dashboard. It combines a public and participant experience,
                organizational operational tools, measurement and evidence workflows,
                ecosystem-service tracking, token-ready benefit circulation and intelligence
                reporting in one governed environment.
              </p>
              <p>
                The platform can support organizations and community pods applying relevant
                frameworks, including Nationally Appropriate Mitigation Actions (NAMAs) and
                Quantified Emission Limitation and Reduction Objectives (QELROs), subject to the
                policy and jurisdictional context in which a deployment is established.
              </p>
            </article>
          </div>
        </div>
      </section>

      <GatedHeader
        num="V"
        title="Four-Part Platform Ecosystem"
        id="layers"
        onSeen={onSectionSeen}
      />
      <section className="border-b border-rule">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-5 md:px-10 md:py-32">
          <NodeHeader num="V" title="Four-Part Platform Ecosystem" id="layers" />
          <div className="mt-12 space-y-12">
            <Layer n="1" title="Organization and asset layer">
              Businesses, plants, public agencies, utilities, supply-chain actors, service providers
              and participating organizations. Organizational registration, asset and facility
              profiles, supplier and product records, resource and emissions data, sustainability
              projects, savings baselines, interventions, evidence uploads, lifecycle tracking and
              decommissioning records.
            </Layer>
            <Layer n="2" title="Community, pod and DAO layer">
              The participatory environment for residents, consumers, community groups, learning
              networks, community pods and DAOs. Onboarding, verified participation, contribution
              records, locally relevant sustainability initiatives, learning activities,
              strategic-planning engagements, community-led proposals and visibility into eligible
              ecosystem and social benefits.
            </Layer>
            <Layer n="3" title="Partner, utility and redemption layer">
              Approved storefronts, organizations, public-use facilities, utilities, service
              providers and sustainable-goods providers. Partner onboarding, acceptance rules, token
              recognition, redemption or discount logic, benefit pass-through arrangements, service
              provisioning, fraud controls, settlement records and partner performance monitoring.
            </Layer>
            <Layer n="4" title="Intelligence, assurance and governance layer">
              Measurement, analytics, reporting, assurance workflows, role-based access, consent
              management, calculation traceability, audit records, exception handling, dashboards
              and policy controls.
            </Layer>
          </div>
        </div>
      </section>

      <GatedHeader num="VI" title="Value-Creation Framework" id="value" onSeen={onSectionSeen} />
      <section className="border-b border-rule bg-surface/40">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-5 md:px-10 md:py-32">
          <NodeHeader num="VI" title="Value-Creation Framework" id="value" />
          <div className="mt-12 max-w-[80ch] space-y-6 text-[16px] leading-[1.8] text-ink-muted">
            <h3 className="font-serif text-[22px] text-ink">Three forms of value</h3>
            <ValueRow n="1" title="Savings">
              Environmental savings (avoided or reduced emissions, reduced waste, conservation,
              improved resource efficiency, ecosystem restoration, better lifecycle outcomes) and
              financial savings (energy efficiency, compute optimization, supply-chain efficiencies,
              avoided costs, shared infrastructure, economies of scale).
            </ValueRow>
            <ValueRow n="2" title="Utility">
              Ecosystem and social value delivered through public-use facilities, public utilities,
              sustainable capital goods, public services and social goods. Utility is a core success
              measure — it keeps the model from treating sustainability solely as a financial-return
              exercise.
            </ValueRow>
            <ValueRow n="3" title="Engagements">
              Participatory and social activity, learning activity, strategic-planning activity, and
              contributions applying environmentally and socially constructive practices. Engagement
              value is created where participation, learning or verified constructive action adds to
              the savings and utility available to another person, pod, DAO or the wider ecosystem.
            </ValueRow>
            <div className="mt-8 grid grid-cols-1 gap-4 pt-6 sm:grid-cols-3">
              <StatCard k="Value forms" v="3" sub="Savings · Utility · Engagements" />
              <StatCard k="Ecosystem scaffolds" v="8" sub="Community · Soil · Water · Climate..." />
              <StatCard k="Gov't alignment" v="3" sub="SDG 9 · 11 · 12" />
            </div>
          </div>
        </div>
      </section>

      <GatedHeader
        num="VII"
        title="Ecosystem-Service Tracking"
        id="ecosystems"
        onSeen={onSectionSeen}
      />
      <section className="border-b border-rule">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-5 md:px-10 md:py-32">
          <NodeHeader num="VII" title="Ecosystem-Service Tracking Rubric" id="ecosystems" />
          <div className="mt-12">
            <div className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 md:grid-cols-4">
              <StatCard
                k="Scaffolds"
                v="8"
                sub="Community · Food · Climate · Soil · Water · Energy · Biodiversity · Culture"
              />
              <StatCard k="GHG scopes" v="4" sub="Scope 1 · 2 · 3a · 3b" />
              <StatCard k="Facets" v="3" sub="Supply chain · Compute · Energy" />
              <StatCard k="Value forms" v="3" sub="Savings · Utility · Engagements" />
            </div>
            <div className="mt-12 grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
              <EcoCard name="Community" lens="Health, equity, income" />
              <EcoCard name="Food & products" lens="Finance, market, yield" />
              <EcoCard name="Climate" lens="Mitigation, adaptation, resilience" />
              <EcoCard name="Soil" lens="Quality, stability, management" />
              <EcoCard name="Water" lens="Quality, quantity, management" />
              <EcoCard name="Energy" lens="Scarcity, quantity, management" />
              <EcoCard name="Biodiversity" lens="Protection, connectivity, quality" />
              <EcoCard name="Culture" lens="Rights, values, practices" />
            </div>
            <p className="mt-10 text-[15px] leading-[1.75] text-ink-muted">
              For each sustainability initiative the system records the baseline condition,
              sustainability barrier, action taken, operating facet, relevant GHG scope, expected
              and realized effects, evidence, beneficiaries, risks, safeguards and eligible value
              outcome.
            </p>
          </div>
        </div>
      </section>

      <GatedHeader
        num="VIII"
        title="Financing & Value Circulation"
        id="financing"
        onSeen={onSectionSeen}
      />
      <section className="border-b border-rule bg-surface/40">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-5 md:px-10 md:py-32">
          <NodeHeader num="VIII" title="Financing & Benefit Circulation" id="financing" />
          <div className="mt-12 space-y-8 max-w-[80ch] text-[16px] leading-[1.8] text-ink-muted">
            <p>
              ELAS-3-CITY is designed as an ecosystem-benefits model rather than only a cash-flow
              model. Potential value and financing streams include:
            </p>
            <ul className="mt-4 list-disc pl-5 space-y-1.5">
              <li>
                <strong>Environmental:</strong> SDG-aligned funding, NDC-related support, eligible
                carbon-credit value
              </li>
              <li>
                <strong>Financial:</strong> energy savings, compute savings, supply-chain savings,
                avoided costs, shared provisioning
              </li>
              <li>
                <strong>Utility:</strong> measured ecosystem services, sustainable infrastructure,
                public services and social goods
              </li>
              <li>
                <strong>Engagement:</strong> community participation, learning, cultural value,
                verified contributions
              </li>
            </ul>
            <p>
              Any carbon-credit or environmental-finance pathway would require independent
              eligibility, methodology, verification, additionality, ownership and regulatory
              assessment. The platform records and manages evidence; it does not represent that
              every action produces a tradable credit.
            </p>
          </div>
        </div>
      </section>

      <GatedHeader
        num="IX"
        title="Governance & Safeguards"
        id="governance"
        onSeen={onSectionSeen}
      />
      <section className="border-b border-rule">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-5 md:px-10 md:py-32">
          <NodeHeader num="IX" title="Governance & Safeguards" id="governance" />
          <div className="mt-12 max-w-[80ch] space-y-5 text-[16px] leading-[1.8] text-ink-muted">
            <p>
              Because ELAS-3-CITY may connect environmental claims, financial incentives, community
              benefits, participant data and tokenized records, governance is built into the
              platform from the outset:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Clear boundaries for emissions accounting across Scope 1, 2, 3a and 3b</li>
              <li>
                Approved methodologies, assumptions, evidence requirements and calculation
                traceability
              </li>
              <li>
                Independent review and assurance workflows where claims, credits or benefits are
                involved
              </li>
              <li>
                Role-based permissions for government, organizational, partner, pod, DAO, reviewer
                and participant functions
              </li>
              <li>
                Privacy-by-design, consent records, data minimization and separation of public and
                sensitive data
              </li>
              <li>
                Fair, transparent benefit-sharing rules for organizations, end users, social actors
                and community pods
              </li>
              <li>Anti-fraud controls, duplicate-claim detection and audit histories</li>
              <li>
                Controls to prevent double counting of emissions reductions, environmental
                attributes and tokenized benefits
              </li>
            </ul>
          </div>
        </div>
      </section>

      <GatedHeader num="X" title="Delivery Roadmap" id="roadmap" onSeen={onSectionSeen} />
      <section className="border-b border-rule bg-surface/40">
        <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-5 md:px-10 md:py-32">
          <NodeHeader num="X" title="Delivery Roadmap" id="roadmap" />
          <div className="mt-12 space-y-10 max-w-[80ch] text-[16px] leading-[1.8] text-ink-muted">
            <RoadmapPhase n="1" title="Foundation and measurement">
              Governance charter, stakeholder mapping and policy co-design; organizational, asset,
              facility and participant onboarding; supply-chain, compute-resource and
              energy-resource baselines; Scope 1–3b boundary and evidence configuration; core
              Savings, Utility and Engagements data model; eight-scaffold ecosystem-service rubric;
              basic dashboards and audit records.
            </RoadmapPhase>
            <RoadmapPhase n="2" title="Operational interventions and partner ecosystem">
              Sustainability-project and intervention workflows; supplier, product lifecycle and
              decommissioning tracking; partner, storefront, utility and service-provider portal;
              community-pod and DAO participation workflows; utility provisioning and benefit
              pass-through rules; eligibility, redemption and settlement controls; expanded
              performance, ecosystem-service and social-value dashboards.
            </RoadmapPhase>
            <RoadmapPhase n="3" title="Token-ready value circulation and scaling">
              Validated-value recognition and token-ready issuance workflows; controlled partner
              recognition, redemption and benefit circulation; environmental-finance opportunity
              register and evidence packs; advanced analytics, hotspot mapping and scenario
              planning; interoperability with utility, procurement, supply-chain, emissions and
              public-reporting systems; multi-jurisdictional scaling where approved.
            </RoadmapPhase>
            <p>
              This proposal is timely as local partners define policy priorities, target sectors,
              community areas and sustainability outcomes that require an operational layer
              connecting projects, measured outcomes, participating organizations and end users.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function DropCapP({ first, children }: { first: string; children: React.ReactNode }) {
  return (
    <p className="first-letter:font-serif first-letter:text-[3em] first-letter:font-bold first-letter:leading-[0.85] first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:text-accent">
      {first}
      {children}
    </p>
  );
}

function PrincipleRow({ n, t, children }: { n: string; t: string; children: React.ReactNode }) {
  return (
    <div className="border border-rule bg-background/40 px-4 py-3">
      <div className="flex items-baseline gap-3">
        <span className="micro text-classified">0{n}</span>
        <span className="font-mono text-[12px] font-medium text-ink">{t}</span>
      </div>
      <p className="mt-1 font-serif text-[15px] italic leading-snug text-ink-muted">{children}</p>
    </div>
  );
}

function GatedHeader({
  num,
  title,
  id,
  onSeen,
}: {
  num: string;
  title: string;
  id: string;
  onSeen: (id: string) => void;
}) {
  useEffect(() => {
    onSeen(id);
  }, [id, onSeen]);
  return (
    <header id={id} className="min-w-0 border-b border-rule pb-6">
      <div className="mx-auto max-w-[1400px] px-4 pt-14 sm:px-5 md:px-10">
        <div className="micro text-accent">RESTRICTED · § {num}</div>
        <h2 className="text-display mt-4 break-words text-[30px] sm:text-[44px] md:text-[64px]">
          <span className="text-ink-faint mr-2 sm:mr-4 font-mono text-[20px] sm:text-[28px] md:text-[36px]">
            {num}.
          </span>
          {title}
        </h2>
      </div>
    </header>
  );
}

function Layer({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <article className="grid min-w-0 gap-6 border-t border-rule pt-10 md:grid-cols-12">
      <div className="min-w-0 md:col-span-3">
        <div className="text-display text-[56px] sm:text-[72px] leading-[0.9] text-accent">{n}</div>
        <div className="mt-3 micro">LAYER 0{n}</div>
      </div>
      <div className="min-w-0 space-y-4 text-[15px] leading-[1.8] text-ink-muted sm:text-[15.5px] md:col-span-9">
        <h3 className="font-serif text-[20px] text-ink">{title}</h3>
        <p>{children}</p>
      </div>
    </article>
  );
}

function ValueRow({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-4 border-t border-rule pt-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline">
      <div>
        <div className="flex items-baseline gap-3">
          <span className="text-display text-[40px] sm:text-[56px] text-accent">{n}.</span>
          <span className="font-serif text-[20px] text-ink">{title}</span>
        </div>
        <p className="mt-2 text-[16px] leading-[1.8] text-ink-muted">{children}</p>
      </div>
    </div>
  );
}

function EcoCard({ name, lens }: { name: string; lens: string }) {
  return (
    <div className="min-w-0 rounded-md border border-rule bg-background/40 p-4">
      <div className="micro text-classified">{name}</div>
      <div className="mt-1 font-serif text-[16px] text-ink">Ecosystem-service lens</div>
      <div className="mt-1 font-mono text-[11px] text-ink-muted break-words [overflow-wrap:anywhere]">
        {lens}
      </div>
    </div>
  );
}

function RoadmapPhase({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-3 border-t border-rule pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline">
      <div>
        <div className="flex items-baseline gap-3">
          <span className="micro text-classified">PHASE {n}</span>
          <span className="font-serif text-[18px] text-ink">{title}</span>
        </div>
        <p className="mt-1 text-[15px] leading-[1.75] text-ink-muted">{children}</p>
      </div>
      <span className="shrink-0 micro text-ink-faint">v1.{n}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────── dialogs ── */

function AckDialog({
  onClose,
  onSubmit,
  onPrivacy,
  defaultEmail = "",
  defaultName = "",
}: {
  onClose: () => void;
  onSubmit: (v: {
    name: string;
    email: string;
    org: string;
    address: string;
    project: string;
    signature: string;
  }) => Promise<void> | void;
  onPrivacy: () => void;
  defaultEmail?: string;
  defaultName?: string;
}) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [org, setOrg] = useState("");
  const [address, setAddress] = useState("");
  const [project, setProject] = useState("ELAS-3-CITY — Expression of Interest Evaluation");
  const [signature, setSignature] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const valid =
    name.trim().length > 1 &&
    /.+@.+\..+/.test(email) &&
    org.trim().length > 1 &&
    address.trim().length > 4 &&
    project.trim().length > 1 &&
    signature.trim().length > 1 &&
    signature.trim().toLowerCase() === name.trim().toLowerCase() &&
    agree;

  const printNda = () => {
    const ndaHtml = renderNdaHtml({
      name: name.trim() || "[ Name of receiving party ]",
      email: email.trim() || "[ recipient email ]",
      org: org.trim() || "[ Name of Organization or person here ]",
      address: address.trim() || "[ Address of receiving party here ]",
      project: project.trim() || "[ Name of Project ]",
      signature: signature.trim() || "",
      date: today,
      ref: REF,
    });
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return;
    w.document.open();
    w.document.write(ndaHtml);
    w.document.close();
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch {
        /* noop */
      }
    }, 300);
  };

  return (
    <Modal onClose={onClose} labelledBy="ack-title" wide>
      <div className="space-y-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <div className="micro">Form 04-A · NDA</div>
            <h3 id="ack-title" className="text-display mt-2 text-[24px] sm:text-[36px]">
              Non-Disclosure Agreement
            </h3>
            <div className="mt-1 font-mono text-[11px] text-ink-faint">{REF}</div>
          </div>
          <span className="stamp shrink-0 text-[9px] sm:text-[10px]">SECTIONS IV — X</span>
        </div>

        <div className="max-h-[40vh] space-y-3 overflow-y-auto border border-rule bg-surface/60 p-4 text-[13px] leading-[1.7] text-ink-muted">
          <p className="text-center font-serif text-[15px] text-ink">
            <strong>(BI-LATERAL) NON-DISCLOSURE AGREEMENT</strong>
            <br />
            <span className="text-[12px]">
              FOR STRATEGIC PLANNING AND EXECUTION OF{" "}
              <span className="text-accent">{project || "[ NAME OF PROJECT ]"}</span>
            </span>
          </p>
          <p>
            This Nondisclosure Agreement (the "Agreement") is entered into, as of the last date
            signed below (the "Effective Date"), by and between{" "}
            <strong className="text-ink">ANOVA CONSULTING INC.</strong> of{" "}
            <em>"Gladstone House" Pinfold Street, St. Michael, Barbados, BB1127</em> ("Disclosing
            Party A") and{" "}
            <strong className="text-ink">{org || "[ Name of Organization or person ]"}</strong> of{" "}
            <em className="text-ink">{address || "[ Address of receiving party ]"}</em> ("Disclosing
            Party B"); for the purpose of preventing the unauthorized disclosure of confidential
            information, relating to the development of a strategic plan for management of the{" "}
            <strong className="text-ink">{project || "[ Project Name ]"}</strong>, as defined below.
          </p>
          <p>
            <strong className="text-ink">1. Definition of Confidential Information.</strong>{" "}
            "Confidential Information" shall include all information or material that has or could
            have commercial value, or other utility in the business in which the Disclosing Party is
            engaged. Written material shall be labelled "Confidential"; oral disclosures shall be
            confirmed in writing.
          </p>
          <p>
            <strong className="text-ink">2. Terms of Non-Disclosure.</strong> Either Party may
            disclose Confidential Information to the other in confidence, identified as proprietary
            by marking or written notification. Neither Party will make any public announcement of,
            or disclose, the existence or terms of this Agreement without prior approval.
          </p>
          <p>
            <strong className="text-ink">3. Obligations of Receiving Party.</strong> The Receiving
            Party shall hold the Confidential Information in strictest confidence, inform employees,
            officers, directors and agents of its confidential nature, and promptly notify the
            Disclosing Party of any unauthorized disclosure or compelled production.
          </p>
          <p>
            <strong className="text-ink">4. Time Periods.</strong> The Receiving Party shall, for a
            period of three (3) years from the end of contract, refrain from disclosing Confidential
            Information without prior written approval, exercising at least reasonable care.
            Non-disclosure obligations survive termination and remain in effect until the
            information ceases to qualify as a trade secret.
          </p>
          <p>
            <strong className="text-ink">5. Use of Intellectual Property.</strong> All Confidential
            Information remains the property of the Disclosing Party. The Recipient shall return or
            destroy Confidential Information on request. Breach entitles the Disclosing Party to
            injunctive relief and actual and exemplary damages.
          </p>
          <p>
            <strong className="text-ink">6. Relationships.</strong> The parties act as independent
            business entities, each performing their respective statements of work to completion or
            end of contract.
          </p>
          <p>
            <strong className="text-ink">7. Severability.</strong> If any provision is found invalid
            or unenforceable, the remainder shall be interpreted so as best to effect the intent of
            the parties.
          </p>
          <p>
            <strong className="text-ink">8. Agreement of Termination.</strong> This Agreement shall
            remain in effect for three (3) years from the Effective Date unless terminated by either
            Party on notice. Confidentiality obligations survive termination.
          </p>
          <p>
            <strong className="text-ink">9. Integration.</strong> This Agreement expresses the
            complete understanding of the parties and supersedes all prior proposals, agreements and
            representations. Amendments require a writing signed by all parties.
          </p>
          <p>
            <strong className="text-ink">10. Waiver.</strong> Failure to exercise any right shall
            not waive prior or subsequent rights. The Agreement binds representatives, assignees and
            successors.
          </p>
          <p>
            <strong className="text-ink">11. Jurisdiction.</strong> This Agreement shall be governed
            by the laws of the Republic of Barbados, without regard to its conflict-of-laws
            provisions.
          </p>
          <p>
            <strong className="text-ink">12. Electronic Signature.</strong> Recipient agrees that
            typing their full legal name in the signature field below constitutes a legally binding
            electronic signature, equivalent to a handwritten signature, in accordance with the
            Electronic Transactions Act of Barbados.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full legal name (Receiving Party signatory)">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Surname, Given Name"
              className="w-full border border-rule bg-background px-3 py-2.5 font-mono text-[13px] text-ink outline-none focus:border-accent"
            />
          </Field>
          <Field label="Institutional email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@institution.gov.bb"
              className="w-full border border-rule bg-background px-3 py-2.5 font-mono text-[13px] text-ink outline-none focus:border-accent"
            />
          </Field>
          <Field label="Organisation / Disclosing Party B">
            <input
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="Municipality or Organisation"
              className="w-full border border-rule bg-background px-3 py-2.5 font-mono text-[13px] text-ink outline-none focus:border-accent"
            />
          </Field>
          <Field label="Address of receiving party">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, City, Country"
              className="w-full border border-rule bg-background px-3 py-2.5 font-mono text-[13px] text-ink outline-none focus:border-accent"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Project name (subject matter of the NDA)">
              <input
                value={project}
                readOnly
                className="w-full border border-rule bg-surface px-3 py-2.5 font-mono text-[13px] text-ink-muted outline-none"
              />
            </Field>
          </div>

          <Field label="Effective date">
            <input
              value={today}
              readOnly
              className="w-full border border-rule bg-surface px-3 py-2.5 font-mono text-[13px] text-ink-muted outline-none"
            />
          </Field>
          <Field label="Reference">
            <input
              value={REF}
              readOnly
              className="w-full border border-rule bg-surface px-3 py-2.5 font-mono text-[13px] text-ink-muted outline-none"
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Electronic signature — type your full legal name (last name first) to sign">
              <input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Last name first, e.g. Smith John A."
                className="w-full border-b-2 border-accent bg-background px-3 py-3 font-serif text-[22px] italic text-ink outline-none"
              />
              <div className="mt-1 font-mono text-[10px] text-ink-muted">
                Format: last name first. Must match your Full legal name above exactly.
              </div>

              {signature && signature.trim().toLowerCase() !== name.trim().toLowerCase() && (
                <div className="mt-1 font-mono text-[10px] text-classified">
                  Signature must match Full legal name.
                </div>
              )}
            </Field>
          </div>
          <label className="md:col-span-2 flex items-start gap-3 text-[13px] text-ink-muted">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-1 accent-[color:var(--accent)]"
            />
            <span>
              I have read and agree to be legally bound by the terms of this Bi-Lateral
              Non-Disclosure Agreement, and I consent to the minimal data processing described in
              the{" "}
              <button onClick={onPrivacy} className="text-accent underline">
                privacy policy
              </button>
              .
            </span>
          </label>
        </div>

        {submitError && (
          <div
            role="alert"
            className="border border-red-500/60 bg-red-500/10 px-4 py-3 font-mono text-[11px] leading-relaxed text-red-200"
          >
            <div className="mb-1 uppercase tracking-[0.16em] text-red-300">Could not save NDA</div>
            <div className="whitespace-pre-wrap break-words text-red-100/90">{submitError}</div>
            <div className="mt-2 text-red-200/70">
              If this keeps happening, screenshot this message and send it to the ELAS-3-CITY team.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 border-t border-rule pt-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <button
            onClick={onClose}
            disabled={submitting}
            className="justify-self-start font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted hover:text-ink disabled:opacity-40 sm:tracking-[0.2em]"
          >
            Cancel
          </button>
          <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
            <button
              onClick={printNda}
              className="border border-rule px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink hover:bg-surface sm:tracking-[0.2em]"
            >
              ⎙ Print NDA
            </button>
            <button
              disabled={!valid || submitting}
              onClick={async () => {
                setSubmitError(null);
                setSubmitting(true);
                try {
                  await onSubmit({
                    name: name.trim(),
                    email: email.trim(),
                    org: org.trim(),
                    address: address.trim(),
                    project: project.trim(),
                    signature: signature.trim(),
                  });
                } catch (err) {
                  const msg =
                    err instanceof Error
                      ? err.message
                      : typeof err === "string"
                        ? err
                        : "Unknown error saving NDA.";
                  setSubmitError(msg);
                } finally {
                  setSubmitting(false);
                }
              }}
              className="border border-accent bg-accent px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40 sm:tracking-[0.2em]"
            >
              {submitting ? "Saving…" : "Sign & Unlock"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function renderNdaHtml(v: {
  name: string;
  email: string;
  org: string;
  address: string;
  project: string;
  signature: string;
  date: string;
  ref: string;
}) {
  const esc = (s: string) =>
    s.replace(/[&<>"']/g, (c) => {
      const map: Record<string, string> = {
        "&": "&" + "amp;",
        "<": "&" + "lt;",
        ">": "&" + "gt;",
        '"': "&" + "quot;",
        "'": "&#" + "39;",
      };
      return map[c] ?? c;
    });
  return `<!doctype html><html><head><meta charset="utf-8" />
<title>NDA — ${esc(v.org)} — ${esc(v.ref)}</title>
<style>
  @page { size: Letter; margin: 0.9in; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; line-height: 1.5; font-size: 11.5pt; }
  .hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #000; padding-bottom: 6pt; margin-bottom: 14pt; font-family: 'Helvetica', sans-serif; font-size: 9pt; letter-spacing: 0.18em; text-transform: uppercase; color: #444; }
  .hdr .brand { font-weight: 700; letter-spacing: 0.28em; color: #000; }
  .stamp { display: inline-block; border: 1.5px solid #b00; color: #b00; padding: 2pt 7pt; font-family: 'Courier New', monospace; font-size: 8.5pt; letter-spacing: 0.2em; }
  h1 { font-size: 16pt; margin: 6pt 0 2pt; text-align: center; }
  .sub { text-align: center; font-size: 10.5pt; letter-spacing: 0.06em; text-transform: uppercase; color: #333; margin-bottom: 14pt; }
  h2 { font-size: 11pt; margin: 14pt 0 4pt; }
  p { margin: 6pt 0; text-align: justify; }
  .parties { background: #fafafa; border: 1px solid #ddd; padding: 8pt 10pt; margin: 8pt 0; }
  .sigblock { margin-top: 32pt; page-break-inside: avoid; }
  .sigrow { display: flex; gap: 32pt; margin-top: 24pt; }
  .sigrow > div { flex: 1; }
  .sigline { border-bottom: 1px solid #000; min-height: 22pt; padding: 4pt 4pt 2pt; }
  .sig-name { font-family: 'Apple Chancery', 'Brush Script MT', cursive; font-size: 20pt; min-height: 30pt; }
  .lbl { font-family: 'Courier New', monospace; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.14em; color: #555; margin: 2pt 0 10pt; }
  .party { font-family: 'Courier New', monospace; font-size: 8.5pt; letter-spacing: 0.16em; color: #333; margin-bottom: 6pt; }
  .ref { font-family: 'Courier New', monospace; font-size: 9pt; color: #555; }
  footer { margin-top: 24pt; font-family: 'Courier New', monospace; font-size: 8pt; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 6pt; }
  .pagefoot { text-align: center; font-family: 'Courier New', monospace; font-size: 8pt; color: #666; margin-top: 18pt; }
</style></head><body>

<div class="hdr">
  <div class="brand">ANOVA CONSULTING</div>
  <div><span class="stamp">CONFIDENTIAL</span></div>
</div>

<h1>(BI-LATERAL) NON-DISCLOSURE AGREEMENT</h1>
<div class="sub">FOR STRATEGIC PLANNING AND EXECUTION OF<br/>${esc(v.project)}</div>

<div class="ref">Reference: ${esc(v.ref)} &nbsp;·&nbsp; Effective Date: ${esc(v.date)}</div>

<p>This Nondisclosure Agreement (the "Agreement") is entered into, as of the last date signed below (the "Effective Date"), by and between <b>ANOVA CONSULTING INC.</b> of <i>"Gladstone House" Pinfold Street, St. Michael, Barbados, BB1127</i> ("Disclosing Party A") and <b>${esc(v.org)}</b> of <i>${esc(v.address)}</i> ("Disclosing Party B"); for the purpose of preventing the unauthorized disclosure of confidential information, relating to the development of a strategic plan for management of <b>${esc(v.project)}</b>, as defined below.</p>

<div class="parties">
  Consequently, these Parties will also be identified as "Receiving Party A" and "Receiving Party B", respectively. The parties agree to enter into a confidential relationship with respect to the disclosure of certain proprietary and confidential information ("Confidential Information"), which may include each Party's: (1) business plans, methods and practices; (2) personnel, customers and suppliers; (3) inventions, processes, methods, products, patent applications and other proprietary rights; and (4) specifications, drawings, sketches, graphics, illustrations, models, samples, tools, computer programs, technical information or other related information.
</div>

<h2>1. Definition of Confidential Information.</h2>
<p>For purposes of this Agreement, "Confidential Information" shall include all information or material that has or could have commercial value, or other utility in the business in which the Disclosing Party is engaged. Written material shall be labelled or stamped "Confidential" (or similar). Oral disclosures shall be promptly confirmed in writing as constituting Confidential Information.</p>

<h2>2. Terms of Non-Disclosure.</h2>
<p>Either Party may disclose Confidential Information to the other in confidence, provided the disclosing Party identifies such information as proprietary and confidential (by marking, or, for oral disclosures or unmarked materials, by notifying the other Party orally, by e-mail, written correspondence or other appropriate means). Neither Party will, without prior approval of the other, make any public announcement of, or otherwise disclose the existence or terms of this Agreement.</p>

<h2>3. Obligations of Receiving Party.</h2>
<p>The Receiving Party shall hold and maintain the Confidential Information in strictest confidence, for the sole and exclusive benefit of the Disclosing Party. The Recipient shall ensure that each of its employees, officers, directors or agents with access to Confidential Information is informed of its proprietary and confidential nature and is required to abide by the terms of this Agreement. The Recipient shall promptly notify the Disclosing Party of any disclosure in violation of this Agreement, or of any subpoena or other legal process requiring production or disclosure of Confidential Information.</p>

<h2>4. Time Periods.</h2>
<p>When informed of the proprietary and confidential nature of Confidential Information disclosed by the other Party, the Receiving Party ("Recipient") shall, for a period of three (3) years from the date of the Recipient's end of contract, refrain from disclosing such Confidential Information to any contractor or other third party without prior written approval from the Disclosing Party, and shall protect such Confidential Information from inadvertent disclosure using the same care and diligence the Recipient uses to protect its own proprietary and confidential information, but in no case less than reasonable care.</p>
<p>The non-disclosure provisions of this Agreement shall survive its termination, and the Receiving Party's duty to hold Confidential Information in confidence shall remain in effect until the Confidential Information no longer qualifies as a trade secret or until the Receiving Party sends the Disclosing Party written notice releasing it from this Agreement, whichever occurs first.</p>

<h2>5. Use of Intellectual Property.</h2>
<p>All Confidential Information disclosed under this Agreement shall be and remain the property of the Disclosing Party, and nothing in this Agreement shall be construed as granting any rights to such Confidential Information to the other Party. The Recipient shall honour any request to promptly return or destroy all copies of Confidential Information disclosed under this Agreement and all notes related thereto. The Parties agree that the Disclosing Party will suffer irreparable injury if its Confidential Information is made public, released to a third party, or otherwise disclosed in breach of this Agreement, and shall be entitled to obtain injunctive relief and an award of actual and exemplary damages from any court of competent jurisdiction.</p>

<h2>6. Relationships.</h2>
<p>This Agreement shall be deemed to constitute all parties as vendors Doing-Business-As their own legal business entity, and all parties will conduct the tasks stipulated under their respective statements of work (SOW) to completion or end of contract.</p>

<h2>7. Severability.</h2>
<p>If a court finds any provision of this Agreement invalid or unenforceable, the remainder of this Agreement shall be interpreted so as best to effect the intent of the parties.</p>

<h2>8. Agreement of Termination.</h2>
<p>This Agreement shall remain in effect for a period of three (3) years from the Effective Date unless otherwise terminated by either Party giving notice to the others of its desire to terminate this Agreement. The requirement to protect Confidential Information disclosed under this Agreement shall survive termination of this Agreement.</p>

<h2>9. Integration.</h2>
<p>This Agreement expresses the complete understanding of the parties with respect to the subject matter and supersedes all prior proposals, agreements, representations and understandings. This Agreement may not be amended except in a writing signed by ALL parties.</p>

<h2>10. Waiver.</h2>
<p>The failure to exercise any right provided in this Agreement shall not be a waiver of prior or subsequent rights. This Agreement and each party's obligations shall be binding on the representatives, assignees and successors of such party. Each party has signed this Agreement through its authorized representative.</p>

<h2>11. Jurisdiction.</h2>
<p>This Agreement shall be governed by the laws of the Republic of Barbados without regard to the conflict-of-laws provisions thereof.</p>

<h2>12. Electronic Signature.</h2>
<p>The parties agree that the typed signature(s) below constitute legally binding electronic signatures, equivalent to handwritten signatures, executed on the date set out above.</p>

<div class="sigblock">
  <div style="font-weight:700; letter-spacing:0.06em;">IN WITNESS WHEREOF:</div>

  <div class="sigrow">
    <div>
      <div class="party">DISCLOSING PARTY A &nbsp;/&nbsp; RECEIVING PARTY B</div>
      <div class="sigline sig-name">Adeyemi Gill</div>
      <div class="lbl">Signature</div>
      <div class="sigline">ADEYEMI GILL</div>
      <div class="lbl">Printed name</div>
      <div class="sigline">${esc(v.date)}</div>
      <div class="lbl">Date</div>
      <div class="sigline">ANOVA CONSULTING INC.</div>
      <div class="lbl">Organisation</div>
    </div>
    <div>
      <div class="party">DISCLOSING PARTY B &nbsp;/&nbsp; RECEIVING PARTY A</div>
      <div class="sigline sig-name">${esc(v.signature)}</div>
      <div class="lbl">Signature</div>
      <div class="sigline">${esc(v.name.toUpperCase())}</div>
      <div class="lbl">Printed name</div>
      <div class="sigline">${esc(v.date)}</div>
      <div class="lbl">Date</div>
      <div class="sigline">${esc(v.org.toUpperCase())}</div>
      <div class="lbl">Organisation</div>
      <div class="lbl" style="margin-top:8pt;">Recipient email: ${esc(v.email)}</div>
    </div>
  </div>
</div>

<footer>${esc(v.ref)} · Printed ${esc(new Date().toISOString())} · Page 1 of 1</footer>
</body></html>`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="micro mb-1.5">{label}</div>
      {children}
    </label>
  );
}

function PolicyDialog({ kind, onClose }: { kind: "privacy" | "gdpr"; onClose: () => void }) {
  const isP = kind === "privacy";
  return (
    <Modal onClose={onClose} labelledBy="policy-title" wide>
      <div className="space-y-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-rule pb-4">
          <div className="min-w-0">
            <div className="micro">{isP ? "Policy 01" : "Policy 02"}</div>
            <h3 id="policy-title" className="text-display mt-2 text-[24px] sm:text-[36px]">
              {isP ? "Privacy Policy" : "GDPR Rights"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 border border-rule px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted hover:text-ink sm:tracking-[0.2em]"
          >
            Close
          </button>
        </div>

        {isP ? (
          <div className="space-y-4 text-[14px] leading-[1.8] text-ink-muted">
            <p>
              This page is a single-document Expression of Interest. It does not set cookies, does
              not load third-party analytics, and does not transmit personal data to any server.
            </p>
            <Heading>Data we process</Heading>
            <p>
              If you choose to acknowledge the confidentiality notice for Sections IV–X, your name
              and institutional email are held only in this browser tab and used solely to render an
              on-screen watermark while you view the restricted content. Sections I–III are openly
              readable and require no acknowledgment.
            </p>
            <Heading>Retention</Heading>
            <p>
              The acknowledgment exists only for the lifetime of this browser tab. Closing the tab
              discards it.
            </p>
            <Heading>Sharing</Heading>
            <p>
              Nothing entered on this page is shared with the document author, third parties, or any
              backend.
            </p>
            <Heading>Contact</Heading>
            <p>
              Questions regarding this notice may be directed to the named ELAS-3-CITY point of
              contact in the covering transmission.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-[14px] leading-[1.8] text-ink-muted">
            <p>
              To the extent the EU General Data Protection Regulation applies to the limited
              in-browser processing described above, you have the following rights:
            </p>
            <ul className="list-none space-y-3">
              {[
                [
                  "Right of access",
                  "Art. 15 — view the data held about you (name & email entered here).",
                ],
                [
                  "Right to rectification",
                  "Art. 16 — correct inaccurate data; simply re-enter the form.",
                ],
                ["Right to erasure", "Art. 17 — closing this browser tab discards the data."],
                [
                  "Right to restrict processing",
                  "Art. 18 — decline the acknowledgment; restricted sections will remain locked.",
                ],
                ["Right to object", "Art. 21 — you may object at any time by leaving the page."],
                [
                  "Right to data portability",
                  "Art. 20 — the only data is what you typed, in your own browser.",
                ],
              ].map(([t, d]) => (
                <li key={t} className="border-l border-accent/50 pl-4">
                  <div className="font-serif text-[18px] text-ink">{t}</div>
                  <div className="font-mono text-[11.5px] text-ink-faint">{d}</div>
                </li>
              ))}
            </ul>
            <p>
              Because no personal data leaves the browser tab, no controller record is kept and no
              transfer is performed.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <div className="micro pt-2">{children}</div>;
}

function Modal({
  children,
  onClose,
  labelledBy,
  wide,
}: {
  children: React.ReactNode;
  onClose: () => void;
  labelledBy: string;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-50 grid max-w-full place-items-center overflow-x-hidden bg-background/80 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${
          wide ? "max-w-3xl" : "max-w-xl"
        } max-h-[90vh] max-w-[calc(100vw-1.5rem)] overflow-y-auto overflow-x-hidden border border-rule bg-surface p-4 shadow-2xl sm:max-w-[calc(100vw-2rem)] sm:p-8`}
      >
        <div className="ribbon-stripe absolute inset-x-0 top-0 h-[3px]" />
        {children}
      </div>
    </div>
  );
}

function Watermark({ name, email }: { name: string; email: string }) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  const text = `${name.toUpperCase()} · ${email} · ${REF} · ${ts} UTC`;
  const rows = Array.from({ length: 20 });
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      <div className="absolute inset-[-20%] -rotate-[24deg]">
        {rows.map((_, i) => (
          <div
            key={i}
            className="whitespace-nowrap py-5 font-mono text-[15px] font-bold tracking-[0.15em] text-classified sm:text-[17px]"
          >
            {Array.from({ length: 6 }).map((__, j) => (
              <span key={j} className="px-8 sm:px-12">
                {text}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfidentialityBanner({
  alreadySigned,
  onDismiss,
  onAck,
  onPrivacy,
  onGdpr,
}: {
  alreadySigned: boolean;
  onDismiss: () => void;
  onAck: () => void;
  onPrivacy: () => void;
  onGdpr: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 max-w-full overflow-x-hidden border-t border-rule bg-surface/95 backdrop-blur">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:px-5 md:px-10">
        <div className="min-w-0 max-w-[72ch] text-[12.5px] leading-relaxed text-ink-muted">
          <div className="micro mb-2 text-classified">Confidentiality Notice</div>
          This page processes minimal personal data (name & email) only if you choose to accept the
          confidentiality acknowledgment for the restricted sections, solely to generate an
          on-screen watermark. Sections I–III are openly readable. No cookies, analytics or tracking
          are used, and nothing leaves this browser tab.{" "}
          <button onClick={onPrivacy} className="text-accent underline-offset-2 hover:underline">
            Read the privacy policy
          </button>
          {" · "}
          <button onClick={onGdpr} className="text-accent underline-offset-2 hover:underline">
            GDPR rights
          </button>
          .
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:items-center">
          <button
            onClick={onDismiss}
            className="min-w-0 border border-rule px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-ink-muted hover:text-ink sm:px-4 sm:text-[11px] sm:tracking-[0.2em]"
          >
            Dismiss
          </button>
          <button
            onClick={alreadySigned ? onDismiss : onAck}
            className="min-w-0 border border-accent bg-accent px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-accent-foreground hover:bg-accent/90 sm:px-4 sm:text-[11px] sm:tracking-[0.2em]"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}

function FootnotesBlock({ ack }: { ack: boolean }) {
  if (!ack) return null;
  return (
    <section className="border-b border-rule bg-surface/40">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-5 md:px-10 text-[12px] leading-[1.7] text-ink-faint">
        <div className="micro text-classified mb-3">FOOTNOTES · RESTRICTED DOSSIER</div>
        <ol className="list-decimal pl-5 space-y-1">
          <li>
            UN 10-Year Framework of Programs on Sustainable Consumption and Production Patterns
            (10YFP).
          </li>
          <li>Greenhouse Gas Protocol corporate standard scopes 1, 2, 3a and 3b.</li>
          <li>SDG 9, 11 and 12.</li>
          <li>FAO Restoration Monitoring Wheel — ecosystem-service scaffolds.</li>
          <li>This Expression of Interest is exploratory and intended to support co-design.</li>
        </ol>
      </div>
    </section>
  );
}

function Colophon({
  ack,
  onPrivacy,
  onGdpr,
}: {
  ack: boolean;
  onPrivacy: () => void;
  onGdpr: () => void;
}) {
  return (
    <footer className="bg-surface">
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-5 md:px-10">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="min-w-0 md:col-span-5">
            <div className="flex min-w-0 items-center gap-3">
              <SealMark />
              <div className="min-w-0">
                <div className="font-serif text-[28px] italic">ELAS-3-CITY</div>
                <div className="micro break-words">
                  A community-centered sustainability platform
                </div>
              </div>
            </div>
            <p className="mt-6 max-w-[48ch] text-[13px] leading-relaxed text-ink-muted">
              This Expression of Interest is submitted for discussion and consideration purposes
              only. It does not constitute a binding offer, a regulatory filing, or a commitment by
              either party, and all figures and architectural details are proposed rather than
              contracted.
            </p>
          </div>
          <div className="md:col-span-3">
            <div className="micro mb-3">Apparatus</div>
            <ul className="space-y-2 text-[13px]">
              <li>
                <a href="#overview" className="hover:text-accent">
                  Executive Summary
                </a>
              </li>
              <li>
                <a href="#context" className="hover:text-accent">
                  Context
                </a>
              </li>
              <li>
                <a href="#whythis" className="hover:text-accent">
                  Why This Matters Now
                </a>
              </li>
              {ack && (
                <>
                  <li>
                    <a href="#model" className="hover:text-accent">
                      Model
                    </a>
                  </li>
                  <li>
                    <a href="#layers" className="hover:text-accent">
                      Ecosystem
                    </a>
                  </li>
                  <li>
                    <a href="#roadmap" className="hover:text-accent">
                      Roadmap
                    </a>
                  </li>
                </>
              )}
            </ul>
          </div>
          <div className="md:col-span-4">
            <div className="micro mb-3">Governance of this page</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onPrivacy}
                className="border border-rule px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:border-accent hover:text-accent"
              >
                Privacy Policy
              </button>
              <button
                onClick={onGdpr}
                className="border border-rule px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:border-accent hover:text-accent"
              >
                GDPR Rights
              </button>
            </div>
            <p className="mt-4 font-mono text-[10.5px] leading-relaxed text-ink-faint">
              Protected view: printing disabled, copy and right-click restricted on classified
              sections, content blurs when this window loses focus.
            </p>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 border-t border-rule pt-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="micro min-w-0 break-words">
            © ELAS-3-CITY · ANOVA — EOI — {REF} — Confidential & Proprietary.
          </div>
          <div className="micro shrink-0">END OF DOSSIER · 10 / 10</div>
        </div>
      </div>
    </footer>
  );
}


