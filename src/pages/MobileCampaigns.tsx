import { useState } from "react";

const CAMPAIGNS = [
  { number: 1,  name: "The Beginning",              theme: "Mars God of War",              miles: 1  },
  { number: 2,  name: "The Foundations",             theme: "Romulus & Remus",              miles: 2  },
  { number: 3,  name: "The Emperor",                 theme: "Augustus",                     miles: 3  },
  { number: 4,  name: "The Legion",                  theme: "Domination of the Roman Army", miles: 4  },
  { number: 5,  name: "The Empire",                  theme: "Trajan",                       miles: 5  },
  { number: 6,  name: "The Hero",                    theme: "Markus Aurelius",              miles: 6  },
  { number: 7,  name: "The Wall",                    theme: "Hadrian",                      miles: 7  },
  { number: 8,  name: "The Restorer of The World",   theme: "Aurelian",                     miles: 8  },
  { number: 9,  name: "The Enemy",                   theme: "Hannibal",                     miles: 9  },
  { number: 10, name: "The Gladiator",               theme: "Spartacus",                    miles: 10 },
  { number: 11, name: "The Fall of Rome",            theme: "Barbarian Invasion",           miles: 11 },
  { number: 12, name: "The Voice of Rome",           theme: "Julius Caesar",                miles: 12 },
];

export default function MobileCampaigns() {
  const currentMiles = 4.5;
  const [selectedCampaign, setSelectedCampaign] = useState<typeof CAMPAIGNS[0] | null>(null);

  function getCampaignProgress(index: number) {
    const current = CAMPAIGNS[index];
    const previousMiles = index === 0 ? 0 : CAMPAIGNS[index - 1].miles;
    const span = current.miles - previousMiles;
    const raw = ((currentMiles - previousMiles) / span) * 100;
    return Math.max(0, Math.min(raw, 100));
  }

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col">
      {/* Compact mobile header */}
      <div className="sticky top-0 z-30 bg-stone-900/95 backdrop-blur-sm border-b border-roman-gold/20 px-4 py-3 text-center">
        <h1 className="text-roman-gold font-serif text-lg font-bold tracking-widest uppercase">
          The Campaigns
        </h1>
        <p className="text-stone-500 text-[10px] italic font-serif mt-0.5">
          Complete each challenge to advance through the history of Rome
        </p>
      </div>

      {/* Vertical timeline — single column for mobile */}
      <div className="flex-1 px-4 py-6">
        <div className="relative">
          {/* Vertical line on the left */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-linear-to-b from-roman-gold/60 via-roman-gold/30 to-roman-gold/10" />

          <div className="space-y-4">
            {CAMPAIGNS.map((c, i) => {
              const cardProgress = getCampaignProgress(i);
              const status = cardProgress >= 100 ? "Completed" : cardProgress > 0 ? "In Progress" : "Locked";

              return (
                <div key={c.number} className="relative flex items-start gap-4">
                  {/* Left dot */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full bg-stone-800 border-2 flex items-center justify-center shadow-[0_0_10px_rgba(212,175,55,0.15)] ${
                      cardProgress >= 100
                        ? "border-roman-gold bg-roman-gold/10"
                        : cardProgress > 0
                        ? "border-roman-gold/60"
                        : "border-stone-600"
                    }`}>
                      {cardProgress >= 100 ? (
                        <svg className="w-4 h-4 text-roman-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className={`font-bold text-xs font-mono ${cardProgress > 0 ? "text-roman-gold" : "text-stone-500"}`}>
                          {c.number}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card */}
                  <div
                    className="flex-1 min-w-0"
                    onClick={() => setSelectedCampaign(c)}
                  >
                    <div className={`bg-stone-800/60 border rounded-xl p-4 active:scale-[0.98] transition-all ${
                      cardProgress >= 100
                        ? "border-roman-gold/30"
                        : cardProgress > 0
                        ? "border-stone-700/50"
                        : "border-stone-700/30"
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-roman-gold font-serif text-base font-bold tracking-wide truncate">
                            {c.name}
                          </h3>
                          <p className="text-stone-400 text-xs mt-0.5 italic truncate">{c.theme}</p>
                        </div>
                        <div className="flex-shrink-0 bg-stone-700/40 rounded-lg px-2.5 py-1">
                          <span className="text-roman-gold font-bold text-xs">{c.miles}</span>
                          <span className="text-stone-500 text-[10px] ml-1">mi</span>
                        </div>
                      </div>

                      {cardProgress > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider mb-1">
                            <span className="text-stone-400">{status}</span>
                            <span className="text-roman-gold/80">{cardProgress.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-stone-700/70 overflow-hidden border border-stone-600/30">
                            <div
                              className="h-full bg-linear-to-r from-roman-gold/60 to-roman-gold transition-all duration-500"
                              style={{ width: `${cardProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Campaign Popup */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-stone-950/80 backdrop-blur-sm"
            onClick={() => setSelectedCampaign(null)}
          />
          <div className="relative bg-stone-900 border-t border-roman-gold/30 rounded-t-2xl p-6 w-full max-w-lg shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            {/* Drag handle */}
            <div className="w-10 h-1 bg-stone-600 rounded-full mx-auto mb-5" />

            <div className="text-center">
              <span className="text-roman-gold/60 font-mono text-xs tracking-widest uppercase mb-2 block">
                Challenge {selectedCampaign.number}
              </span>
              <h3 className="text-stone-100 font-serif text-2xl font-bold mb-1">
                {selectedCampaign.name}
              </h3>
              <p className="text-roman-gold italic text-sm mb-6">
                {selectedCampaign.theme}
              </p>

              <div className="bg-stone-800/50 rounded-xl p-3 mb-6 border border-stone-700/30">
                <div className="text-stone-400 text-xs mb-0.5 uppercase tracking-tighter font-semibold">Requirement</div>
                <div className="text-xl font-bold text-stone-100">
                  {selectedCampaign.miles} <span className="text-stone-500 text-base">Miles</span>
                </div>
              </div>

              {getCampaignProgress(CAMPAIGNS.findIndex(c => c.number === selectedCampaign.number)) >= 100 ? (
                <div className="w-full bg-stone-800 text-stone-500 font-bold py-3.5 rounded-xl border border-stone-700/50 cursor-not-allowed uppercase tracking-widest flex items-center justify-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-roman-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Completed
                </div>
              ) : (
                <button
                  className="w-full bg-roman-gold active:bg-roman-gold/80 text-stone-900 font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-all active:scale-[0.98] uppercase tracking-widest text-sm"
                  onClick={() => {
                    console.log(`Starting campaign: ${selectedCampaign.name}`);
                    setSelectedCampaign(null);
                  }}
                >
                  Begin Campaign
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
