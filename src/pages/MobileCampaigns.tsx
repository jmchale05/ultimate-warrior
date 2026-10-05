import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { FullPageLoader } from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { getResultsByStudent, getUserDoc } from "../lib/firestore";
import { CAMPAIGNS, TOTAL_MILES, roundMiles } from "../lib/campaignConfig";
import type { AppUser, Result } from "../types";

type CampaignStatus = "locked" | "active" | "complete";

function milesByCampaign(results: Result[]): Record<number, number> {
  const byCampaign: Record<number, number> = {};
  for (const result of results) {
    const match = result.challengeId?.match(/^campaign-(\d+)$/);
    if (!match) continue;
    const number = parseInt(match[1], 10);
    byCampaign[number] = roundMiles(Math.min((byCampaign[number] ?? 0) + result.distanceMiles, number));
  }
  return byCampaign;
}

export default function MobileCampaigns() {
  const { appUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [student, setStudent] = useState<AppUser | null>(null);
  const [campaignMiles, setCampaignMiles] = useState<Record<number, number>>({});
  const [watchedEndVideos, setWatchedEndVideos] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!appUser || appUser.role !== "student") return;
    const studentId = appUser.uid;
    const schoolId = appUser.schoolId;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const [user, results] = await Promise.all([
          getUserDoc(studentId),
          getResultsByStudent(studentId, schoolId),
        ]);
        if (cancelled) return;
        const byCampaign = milesByCampaign(results);
        setStudent(user);
        setCampaignMiles(byCampaign);
        setWatchedEndVideos(new Set(user?.watchedCampaignEndVideos ?? []));
      } catch (error) {
        console.error("Failed to load home:", error);
        if (!cancelled) setLoadError("Could not load your campaigns. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [appUser]);

  if (authLoading) return <FullPageLoader />;
  if (!appUser) return <Navigate to="/login" replace />;
  if (appUser.role === "admin") return <Navigate to="/admin" replace />;
  if (appUser.role !== "student") return <Navigate to="/campaigns" replace />;

  function getCampaignStatus(campaignNumber: number): CampaignStatus {
    const myMiles = campaignMiles[campaignNumber] ?? 0;
    const required = CAMPAIGNS[campaignNumber - 1]?.milesRequired ?? campaignNumber;
    if (myMiles >= required) return "complete";
    const previousComplete =
      campaignNumber === 1 ||
      ((campaignMiles[campaignNumber - 1] ?? 0) >= campaignNumber - 1 && watchedEndVideos.has(campaignNumber - 1));
    return previousComplete ? "active" : "locked";
  }

  const totalMiles = CAMPAIGNS.reduce(
    (sum, campaign) => sum + Math.min(campaignMiles[campaign.number] ?? 0, campaign.milesRequired),
    0,
  );
  const progress = Math.min(100, Math.round((totalMiles / TOTAL_MILES) * 100));
  const activeCampaign = CAMPAIGNS.find((campaign) => getCampaignStatus(campaign.number) === "active") ?? CAMPAIGNS[0];
  const displayName = student?.displayName ?? appUser.displayName;
  const studentUid = appUser.uid;

  function openCampaign(campaignNumber: number) {
    navigate(`/campaigns/${studentUid}?campaign=${campaignNumber}`);
  }

  return (
    <div className="min-h-dvh bg-stone-900 text-stone-100 flex flex-col">
      <Navbar />

      {loading ? (
        <FullPageLoader />
      ) : loadError ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="roman-card rounded-2xl px-8 py-8 max-w-lg w-full text-center">
            <h2 className="text-roman-gold font-serif text-2xl font-bold mb-3">Home Unavailable</h2>
            <p className="text-stone-400 mb-6">{loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-lg border border-roman-gold/40 text-roman-gold text-xs uppercase tracking-wider font-semibold"
            >
              Reload
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-6 pb-8 max-w-lg mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full border-2 border-roman-gold/50 overflow-hidden bg-stone-800 shrink-0">
                {student?.photoUrl ? (
                  <img src={student.photoUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <img src="/profile-pics.png" alt="Warrior" className="w-full h-full object-cover opacity-70" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-stone-500 text-xs uppercase tracking-[0.28em] font-semibold">Welcome</p>
                <h1 className="text-roman-gold font-serif text-3xl font-bold leading-tight truncate">{displayName}</h1>
                {student?.romanNickname && (
                  <p className="text-roman-gold/70 italic font-serif truncate">{student.romanNickname}</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-roman-gold/25 bg-stone-800/40 px-5 py-4 mb-5">
              <div className="flex items-end justify-between mb-2">
                <p className="text-stone-400 text-xs uppercase tracking-[0.28em] font-semibold">Total Miles</p>
                <p className="text-roman-gold font-semibold">{progress}%</p>
              </div>
              <p className="text-stone-50 font-serif text-3xl font-bold mb-3">
                {totalMiles.toFixed(1)}
                <span className="text-stone-500 text-base font-sans font-normal ml-1">/ {TOTAL_MILES} mi</span>
              </p>
              <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
                <div className="h-full rounded-full bg-linear-to-r from-roman-gold/50 to-roman-gold" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => openCampaign(activeCampaign.number)}
              className="w-full mb-8 rounded-2xl border border-roman-gold/70 bg-linear-to-r from-roman-gold/90 via-amber-300 to-roman-gold/90 px-5 py-4 text-left shadow-[0_0_22px_rgba(212,175,55,0.28)]"
            >
              <p className="text-stone-950/70 text-[10px] uppercase tracking-[0.28em] font-bold">
                {getCampaignStatus(activeCampaign.number) === "complete" ? "Campaign" : "Continue"}
              </p>
              <p className="text-stone-950 font-serif text-2xl font-bold leading-tight">{activeCampaign.name}</p>
              <p className="text-stone-950/80 text-sm italic">{activeCampaign.subtitle}</p>
            </button>

            <p className="text-stone-500 text-xs uppercase tracking-[0.28em] font-semibold mb-3">The Campaigns</p>
            <div className="space-y-3">
              {CAMPAIGNS.map((campaign) => {
                const status = getCampaignStatus(campaign.number);
                const miles = Math.min(campaignMiles[campaign.number] ?? 0, campaign.milesRequired);
                const percent = Math.min(100, Math.round((miles / campaign.milesRequired) * 100));
                return (
                  <button
                    key={campaign.number}
                    type="button"
                    onClick={() => openCampaign(campaign.number)}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${
                      status === "complete"
                        ? "border-roman-gold/30 bg-stone-800/50"
                        : status === "active"
                        ? "border-roman-gold/50 bg-stone-800/70"
                        : "border-stone-700/40 bg-stone-900/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          status === "complete"
                            ? "bg-roman-gold text-stone-950"
                            : status === "active"
                            ? "border border-roman-gold/60 text-roman-gold"
                            : "border border-stone-700 text-stone-500"
                        }`}
                      >
                        {status === "complete" ? "✓" : campaign.number}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-serif font-bold truncate ${status === "locked" ? "text-stone-500" : "text-stone-100"}`}>
                          {campaign.name}
                        </p>
                        <p className="text-stone-500 text-xs truncate">{campaign.subtitle}</p>
                      </div>
                      <p className="text-xs text-stone-400 shrink-0">
                        {miles}/{campaign.milesRequired} mi
                      </p>
                    </div>
                    {status !== "locked" && (
                      <div className="mt-3 h-1.5 rounded-full bg-stone-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${status === "complete" ? "bg-roman-gold" : "bg-roman-gold/70"}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
