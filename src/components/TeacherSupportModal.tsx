type TeacherSupportModalProps = {
  onClose: () => void;
  onOpenTerms: () => void;
};

const supportEmail = "support@tuwc.online";

const supportQuestions = [
  {
    q: "How do I add a student?",
    a: "On the Campaigns page, scroll to the bottom of the student table and click '+ Add Student'. Fill in their name, year, and upload an optional photo.",
  },
  {
    q: "How do students log miles?",
    a: "Click on a student's name in the table to open their campaign page. On their active campaign, click 'Watch Intro & Begin', then log miles to progress.",
  },
  {
    q: "What are the 12 campaigns?",
    a: "Each campaign represents a stage of the Roman Empire, requiring a set number of miles (1 mi for Campaign 1, up to 12 mi for Campaign 12). Watch the end video of a completed campaign to unlock the next.",
  },
  {
    q: "How are ranks determined?",
    a: "Ranks are earned dynamically based on total miles completed across all campaigns. Progressing further elevates the student's Roman authority rank.",
  },
  {
    q: "Want to remove a student?",
    a: "On the Campaigns page, click the three dots (...) in a student's row, then select 'Delete Student'. This will queue the student for final removal by an admin.",
  },
  {
    q: "How do I contact support?",
    a: `Email us directly at ${supportEmail} and we'll get back to you within one business day.`,
  },
];

export default function TeacherSupportModal({ onClose, onOpenTerms }: TeacherSupportModalProps) {
  return (
    <div className="fixed inset-0 z-9999 flex items-start justify-center overflow-y-auto px-3 py-4 sm:items-center sm:px-6 sm:py-8">
      <button
        type="button"
        aria-label="Close teacher support"
        className="absolute inset-0 h-full w-full cursor-default bg-stone-950/85 backdrop-blur-sm"
        onClick={onClose}
      />

      <section className="relative my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-roman-gold/25 bg-stone-950/95 shadow-[0_24px_80px_rgba(0,0,0,0.75)] ring-1 ring-white/5 sm:max-h-[calc(100dvh-4rem)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.16),transparent_70%)]" />
        <div className="h-px w-full bg-linear-to-r from-transparent via-roman-gold/60 to-transparent" />

        <div className="relative flex min-h-0 flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-roman-gold/15 px-5 py-5 sm:px-7 sm:py-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-roman-gold/60">
                  Help Centre
                </p>
                <div className="h-3 w-px bg-roman-gold/30"></div>
                <button
                  type="button"
                  onClick={onOpenTerms}
                  className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 hover:text-roman-gold transition-colors"
                >
                  View Policies
                </button>
              </div>
              <h2 className="font-serif text-2xl font-bold tracking-wide text-roman-gold sm:text-3xl">
                Teacher Support
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-400">
                Quick answers for managing students, campaigns, mileage, ranks, and account support.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close support modal"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-stone-700/70 bg-stone-900/80 text-stone-400 transition-colors hover:border-roman-gold/50 hover:text-roman-gold"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </header>

          <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {supportQuestions.map(({ q, a }, index) => (
                <article
                  key={q}
                  className="rounded-xl border border-stone-700/60 bg-stone-900/65 p-4 shadow-inner transition-colors hover:border-roman-gold/35 hover:bg-stone-900"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-roman-gold/25 bg-roman-gold/10 text-xs font-bold text-roman-gold">
                      {index + 1}
                    </span>
                    <h3 className="pt-1 text-sm font-bold leading-snug text-roman-gold">
                      {q}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-stone-300">
                    {a}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <footer className="border-t border-roman-gold/15 bg-stone-950/80 px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex flex-col gap-5 rounded-2xl border border-roman-gold/20 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08),transparent_70%)] p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
                  Direct Support
                </p>
                <a
                  href={`mailto:${supportEmail}`}
                  className="block break-all font-serif text-lg font-bold tracking-wide text-roman-gold transition-colors hover:text-roman-gold-light sm:text-xl"
                >
                  {supportEmail}
                </a>
              </div>

              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-roman-gold to-yellow-500 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-stone-950 shadow-[0_0_20px_rgba(235,191,90,0.25)] transition-all hover:brightness-110"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
                Send Email
              </a>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
