import { useEffect, useState } from "react";

const githubRepo = "jmchale05/ultimate-warrior";
const releasesPage = `https://github.com/${githubRepo}/releases`;

const downloads = [
  {
    name: "Windows",
    label: "Download for Windows",
    assetPattern: /\.(exe|msi)$/i,
    hint: "Recommended for most desktop users.",
  },
  {
    name: "macOS",
    label: "Download for Mac",
    assetPattern: /\.dmg$/i,
    hint: "Signed build and notarization ready when you publish it.",
  },
  {
    name: "Linux",
    label: "Download for Linux",
    assetPattern: /\.AppImage$/i,
    hint: "AppImage works well for direct installs.",
  },
];

const steps = [
  "Pick your platform and download the installer.",
  "Open the file and follow the install prompts.",
  "Launch Ultimate Warrior Challenges from your desktop.",
];

export default function DownloadPage() {
  const [downloadLinks, setDownloadLinks] = useState(() =>
    downloads.map((download) => ({
      ...download,
      href: releasesPage,
      available: false,
    })),
  );
  const [releaseStatus, setReleaseStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadLatestRelease() {
      try {
        const response = await fetch(`https://api.github.com/repos/${githubRepo}/releases/latest`, {
          headers: {
            Accept: "application/vnd.github+json",
          },
        });

        if (!response.ok) {
          throw new Error(`GitHub release lookup failed with ${response.status}`);
        }

        const release = await response.json();
        const assets: Array<{ name?: string; browser_download_url?: string }> = Array.isArray(release.assets)
          ? release.assets
          : [];

        const nextLinks = downloads.map((download) => {
          const match = assets.find((asset) => download.assetPattern.test(asset.name ?? ""));

          return {
            ...download,
            href: match?.browser_download_url ?? release.html_url ?? releasesPage,
            available: Boolean(match?.browser_download_url),
          };
        });

        if (!cancelled) {
          setDownloadLinks(nextLinks);
          setReleaseStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setDownloadLinks(
            downloads.map((download) => ({
              ...download,
              href: releasesPage,
              available: false,
            })),
          );
          setReleaseStatus("missing");
        }
      }
    }

    loadLatestRelease();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen roman-bg text-stone-100">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(139,28,28,0.22),transparent_35%)]" />
        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 py-14 sm:px-10 lg:px-12">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-3 rounded-full border border-roman-gold/25 bg-stone-950/60 px-4 py-2 text-sm uppercase tracking-[0.25em] text-roman-gold/90 shadow-lg shadow-black/20 backdrop-blur">
                Desktop App Download
              </div>

              <div className="space-y-5">
                <h1 className="max-w-3xl text-5xl font-black uppercase leading-none tracking-tight text-stone-50 sm:text-6xl lg:text-7xl">
                  Get <span className="text-roman-gold">Ultimate Warrior</span> Challenges on your desktop
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-stone-300 sm:text-xl">
                  Download the installer for your computer and launch the full desktop experience.
                  Keep your campaigns, tracking, and admin tools in one place.
                </p>
              </div>

              {releaseStatus !== "ready" && (
                <div className="rounded-2xl border border-roman-gold/20 bg-stone-950/70 p-4 text-sm leading-6 text-stone-300">
                  No published installer was found yet, so the buttons will take you to the project releases page.
                  {releaseStatus === "missing" ? " Publish a GitHub release to make the direct downloads available." : ""}
                </div>
              )}

              <div className="flex flex-wrap gap-4">
                <a
                  href={downloadLinks[0].href}
                  className="inline-flex items-center justify-center rounded-xl bg-roman-red px-6 py-4 text-sm font-bold uppercase tracking-[0.2em] text-roman-gold shadow-lg shadow-roman-red/30 transition hover:-translate-y-px hover:bg-roman-red-dark"
                >
                  {downloadLinks[0].available ? "Download for Windows" : "View releases"}
                </a>
                <a
                  href="#downloads"
                  className="inline-flex items-center justify-center rounded-xl border border-roman-gold/35 bg-stone-950/60 px-6 py-4 text-sm font-bold uppercase tracking-[0.2em] text-stone-100 transition hover:border-roman-gold hover:bg-stone-900/80"
                >
                  Choose a platform
                </a>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Fast install", "Get set up in a few clicks."],
                  ["Desktop only", "Built for larger screens and keyboard workflows."],
                  ["Ready to ship", "Hook these links to your release files."],
                ].map(([title, description]) => (
                  <div key={title} className="roman-card rounded-2xl p-5">
                    <div className="text-sm uppercase tracking-[0.2em] text-roman-gold/80">{title}</div>
                    <p className="mt-2 text-sm leading-6 text-stone-300">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="roman-card rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/30">
              <div className="flex items-center gap-4 border-b border-roman-gold/15 pb-6">
                <img
                  src="/ultimate-warrior.png"
                  alt="Ultimate Warrior"
                  className="h-16 w-16 rounded-2xl object-contain bg-stone-950/60 p-2 shadow-lg shadow-black/30"
                />
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-roman-gold/80">Download Center</p>
                  <h2 className="mt-1 text-2xl font-bold text-stone-50">Choose your installer</h2>
                </div>
              </div>

              <div id="downloads" className="mt-6 space-y-4">
                {downloadLinks.map((download) => (
                  <a
                    key={download.name}
                    href={download.href}
                    className="block rounded-2xl border border-stone-700/80 bg-stone-950/70 p-5 transition hover:border-roman-gold/60 hover:bg-stone-900/80"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.25em] text-roman-gold/75">{download.name}</div>
                        <div className="mt-1 text-lg font-semibold text-stone-50">{download.label}</div>
                      </div>
                      <div className="rounded-full border border-roman-gold/25 px-3 py-1 text-xs uppercase tracking-[0.2em] text-roman-gold">
                        {download.available ? "Installer" : "Releases"}
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-stone-400">{download.hint}</p>
                  </a>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-roman-gold/20 bg-roman-red/10 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-roman-gold/80">Install steps</p>
                <ol className="mt-4 space-y-3 text-sm leading-6 text-stone-200">
                  {steps.map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-roman-gold text-xs font-black text-stone-950">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-4 rounded-2xl border border-stone-700/80 bg-stone-950/70 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-roman-gold/80">Need help?</p>
                <p className="mt-2 text-sm leading-6 text-stone-300">
                  If the installer will not open, the download fails, or you need help getting set up,
                  contact support and we will point you in the right direction.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="mailto:support@ultimatewarriorchallenge.com"
                    className="inline-flex items-center justify-center rounded-xl border border-roman-gold/35 bg-roman-gold/10 px-4 py-2.5 text-sm font-bold uppercase tracking-[0.18em] text-roman-gold transition hover:border-roman-gold hover:bg-roman-gold/15"
                  >
                    Email support
                  </a>
                  <a
                    href="mailto:support@ultimatewarriorchallenge.com?subject=Ultimate%20Warrior%20Challenges%20Help"
                    className="inline-flex items-center justify-center rounded-xl border border-stone-700 px-4 py-2.5 text-sm font-bold uppercase tracking-[0.18em] text-stone-200 transition hover:border-stone-500 hover:bg-stone-900"
                  >
                    Get installation help
                  </a>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-stone-500">
                  support@ultimatewarriorchallenge.com
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
