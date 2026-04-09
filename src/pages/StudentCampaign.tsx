import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import Navbar from "../components/Navbar";
import { StudentCampaignSkeleton } from "../components/LoadingSpinner";
import { getUserDoc, getResultsByStudent, submitResult, updateUserPhoto } from "../lib/firestore";
import type { AppUser, Result } from "../types";

const CAMPAIGNS = [
  {
    number: 1, name: "The Beginning", subtitle: "Mars God of War", milesRequired: 1,
    startVideo: "/beginning.mars.mov", endVideo: "/end.mars.mov",
    image: "/campaigns/mars.png",
    description: "Every warrior's journey begins with a single step. Mars, the God of War, watches over those brave enough to take the first stride. Complete your first mile and prove you are worthy of the path ahead.",
  },
  {
    number: 2, name: "The Foundations", subtitle: "Romulus & Remus", milesRequired: 2,
    startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4",
    image: "/campaigns/romulus.png",
    description: "Twin brothers raised by wolves founded the greatest civilisation the world has ever known. Like Romulus and Remus, you must build strong foundations. Run 2 miles to lay the first stones of your empire.",
  },
  {
    number: 3, name: "The Emperor", subtitle: "Augustus", milesRequired: 3,
    startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4",
    image: "/campaigns/augustus.png",
    description: "Augustus transformed Rome from a republic into an unstoppable empire. To follow in his footsteps, you must show discipline and endurance. Conquer 3 miles to claim the imperial mantle.",
  },
  {
    number: 4, name: "The Legion", subtitle: "Domination of the Roman Army", milesRequired: 4,
    startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4",
    image: "/campaigns/legion.png",
    description: "The Roman Legion was the most feared fighting force in the ancient world. Discipline, formation, and relentless marching made them unstoppable. Push through 4 miles and earn your place in the ranks.",
  },
  {
    number: 5, name: "The Empire", subtitle: "Trajan", milesRequired: 5,
    startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4",
    image: "/campaigns/Trajan1.jpg",
    description: "Under Trajan, the Roman Empire reached its greatest territorial extent. His campaigns stretched across mountains and deserts. Cover 5 miles to expand the borders of your own empire.",
  },
  {
    number: 6, name: "The Hero", subtitle: "Markus Aurelius", milesRequired: 6,
    startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4",
    image: "/campaigns/aurelius.png",
    description: "Marcus Aurelius, the philosopher emperor, believed strength comes from within. He led from the front lines while writing his Meditations. Run 6 miles with the wisdom and courage of a true hero.",
  },
  {
    number: 7, name: "The Wall", subtitle: "Hadrian", milesRequired: 7,
    startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4",
    image: "/campaigns/Hadrian6.jpg",
    description: "Hadrian built a wall that stretched 73 miles across Britannia - a monument to Roman engineering and determination. Push through 7 miles and build your own unbreakable barrier.",
  },
  {
    number: 8, name: "The Restorer of The World", subtitle: "Aurelian", milesRequired: 8,
    startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4",
    image: "/campaigns/Aurelian7.jpg",
    description: "When the empire was fracturing, Aurelian reunited it through sheer force of will. He earned the title Restitutor Orbis - Restorer of the World. Complete 8 miles to restore your own strength.",
  },
  {
    number: 9, name: "The Enemy", subtitle: "Hannibal", milesRequired: 9,
    startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4",
    image: "/campaigns/Hannibal3.jpg",
    description: "Hannibal Barca marched elephants across the Alps to strike at the heart of Rome. He was the greatest enemy Rome ever faced. Endure 9 miles and prove you can overcome any obstacle in your path.",
  },
  {
    number: 10, name: "The Gladiator", subtitle: "Spartacus", milesRequired: 10,
    startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4",
    image: "/campaigns/Spartacus5.jpg",
    description: "Spartacus rose from slavery to lead the greatest rebellion Rome had ever seen. His courage inspired thousands to fight for freedom. Push through 10 miles with the heart of a gladiator.",
  },
  {
    number: 11, name: "The Fall of Rome", subtitle: "Barbarian Invasion", milesRequired: 11,
    startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4",
    image: "/campaigns/TheFallofRome2.jpg",
    description: "The barbarian hordes descended on Rome from every direction. Only the strongest warriors survived the fall. Fight through 11 miles and prove you can endure when all seems lost.",
  },
  {
    number: 12, name: "The Voice of Rome", subtitle: "Julius Caesar", milesRequired: 12,
    startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4",
    image: "/campaigns/12.png",
    description: "Julius Caesar conquered Gaul, crossed the Rubicon, and changed the world forever. He is the ultimate warrior. Complete the final 12 miles and cement your legacy as a true champion of Rome.",
  },
];

const TOTAL_MILES = 78;

function roundMiles(value: number) {
  return Math.round(value * 10) / 10;
}

function getCampaignMedalName(campaignNumber: number) {
  const campaign = CAMPAIGNS[campaignNumber - 1];
  return campaign ? `${campaign.name} Medal` : "Warrior Medal";
}

export default function StudentCampaign() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<AppUser | null>(null);
  const [campaignMiles, setCampaignMiles] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(1);
  const [videoModal, setVideoModal] = useState<{ src: string; campaignNumber: number; isEnd?: boolean } | null>(null);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [watchedCampaigns, setWatchedCampaigns] = useState<Set<number>>(new Set());
  const [watchedEndVideos, setWatchedEndVideos] = useState<Set<number>>(new Set());
  const [awardModalCampaign, setAwardModalCampaign] = useState<number | null>(null);
  const [mileInput, setMileInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [imgError, setImgError] = useState<Set<number>>(new Set());
  const [showGrandFinale, setShowGrandFinale] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    setPhotoUploading(true);
    try {
      const url = await updateUserPhoto(uid, file);
      setStudent((prev) => prev ? { ...prev, photoUrl: url } : prev);
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function handleLogMiles(campaignNumber: number, milesRequired: number) {
    const input = parseFloat(mileInput);
    if (!input || input <= 0 || !uid || !student) return;
    const already = campaignMiles[campaignNumber] ?? 0;
    const remaining = milesRequired - already;
    const toLog = roundMiles(Math.min(input, remaining));
    if (toLog <= 0) return;
    setSubmitting(true);
    await submitResult({
      challengeId: `campaign-${campaignNumber}`,
      studentId: uid,
      classId: student.classId ?? "",
      distanceMiles: toLog,
      completedAt: Date.now(),
    });
    const newTotal = already + toLog;
    setCampaignMiles((prev) => ({ ...prev, [campaignNumber]: newTotal }));
    setMileInput("");
    setSubmitting(false);

    if (newTotal >= milesRequired) {
      const duration = 1000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 12, angle: 60, spread: 70, startVelocity: 55, origin: { x: 0, y: 0.6 }, colors: ["#d4af37", "#ffd700", "#b8860b", "#fff8dc", "#fffacd"] });
        confetti({ particleCount: 12, angle: 120, spread: 70, startVelocity: 55, origin: { x: 1, y: 0.6 }, colors: ["#d4af37", "#ffd700", "#b8860b", "#fff8dc", "#fffacd"] });
        confetti({ particleCount: 6, angle: 90, spread: 120, startVelocity: 45, origin: { x: 0.5, y: 0.5 }, colors: ["#d4af37", "#ffd700", "#b8860b", "#fff8dc", "#fffacd"] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }

  useEffect(() => {
    if (!uid) return;
    async function loadData() {
      setLoading(true);
      const [user, results] = await Promise.all([getUserDoc(uid!), getResultsByStudent(uid!)]);
      setStudent(user);
      const bycampaign: Record<number, number> = {};
      for (const r of results as Result[]) {
        const match = r.challengeId?.match(/^campaign-(\d+)$/);
        if (match) {
          const num = parseInt(match[1]);
          bycampaign[num] = roundMiles(Math.min((bycampaign[num] ?? 0) + r.distanceMiles, num));
        }
      }
      setCampaignMiles(bycampaign);
      let activeCampaign = 1;
      for (const c of CAMPAIGNS) {
        if ((bycampaign[c.number] ?? 0) >= c.milesRequired) {
          activeCampaign = Math.min(c.number + 1, 12);
        } else {
          break;
        }
      }
      setSelectedCampaign(activeCampaign);
      setLoading(false);
    }
    loadData();
  }, [uid]);

  const totalMiles = CAMPAIGNS.reduce((sum, c) => sum + Math.min(campaignMiles[c.number] ?? 0, c.milesRequired), 0);

  function getCampaignStatus(c: typeof CAMPAIGNS[0]) {
    const myMiles = campaignMiles[c.number] ?? 0;
    if (myMiles >= c.milesRequired) return "complete";
    const prevComplete =
      c.number === 1 ||
      ((campaignMiles[c.number - 1] ?? 0) >= (c.number - 1) && watchedEndVideos.has(c.number - 1));
    if (prevComplete) return "active";
    return "locked";
  }

  function closeVideoModal() {
    setVideoModal(null);
    setIsPlayingVideo(false);
  }

  function handleVideoEnded() {
    if (!videoModal) return;
    if (videoModal.isEnd) {
      setWatchedEndVideos((prev) => new Set(prev).add(videoModal.campaignNumber));
      setAwardModalCampaign(videoModal.campaignNumber);
    } else {
      setWatchedCampaigns((prev) => new Set(prev).add(videoModal.campaignNumber));
    }
    setVideoModal(null);
    setIsPlayingVideo(false);
  }

  const campaign = CAMPAIGNS[selectedCampaign - 1];
  const status = campaign ? getCampaignStatus(campaign) : "locked";
  const myMiles = campaignMiles[selectedCampaign] ?? 0;
  const progress = campaign ? Math.min(100, Math.round((myMiles / campaign.milesRequired) * 100)) : 0;
  const canLogMiles = status === "active" && (watchedCampaigns.has(selectedCampaign) || myMiles > 0);
  const nextCampaign = campaign && campaign.number < CAMPAIGNS.length ? CAMPAIGNS[campaign.number] : null;
  const nextCampaignLocked = Boolean(nextCampaign && getCampaignStatus(nextCampaign) === "locked");

  return (
    <div className="h-screen bg-stone-900 text-stone-100 flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        <div className="flex-1 min-h-0 w-full overflow-hidden">
          {loading ? (
            <div className="px-14 py-10">
              <StudentCampaignSkeleton />
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Top bar: back, student info, navigation */}
              <div className="px-10 pt-6 pb-4 border-b border-stone-800/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-5">
                  <button
                    onClick={() => navigate("/campaigns")}
                    className="text-stone-500 hover:text-roman-gold transition-colors text-sm uppercase tracking-wider font-semibold cursor-pointer"
                  >
                    ← Back
                  </button>
                  <div className="w-px h-8 bg-stone-700/50" />
                  {/* Avatar */}
                  <div className="relative group shrink-0">
                    <div className="w-14 h-14 rounded-full border-2 border-roman-gold/50 overflow-hidden bg-stone-800 flex items-center justify-center">
                      {student?.photoUrl ? (
                        <img src={student.photoUrl} alt={student.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <img src="/warrior.png" alt="Warrior" className="w-full h-full object-cover opacity-60" />
                      )}
                    </div>
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      title="Upload photo"
                      className="absolute inset-0 rounded-full bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer disabled:cursor-wait"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-roman-gold">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </button>
                    <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </div>
                  <div>
                    <p className="text-roman-gold font-serif font-bold text-3xl leading-tight">{student?.displayName ?? "Unknown Warrior"}</p>
                    <p className="text-stone-400 text-sm mt-0.5">{totalMiles.toFixed(1)} / {TOTAL_MILES} total miles</p>
                  </div>
                </div>

                {/* Campaign step indicators */}
                <div className="flex items-center gap-1.5">
                  {CAMPAIGNS.map((c) => {
                    const s = getCampaignStatus(c);
                    const isSelected = c.number === selectedCampaign;
                    return (
                      <button
                        key={c.number}
                        onClick={() => { setSelectedCampaign(c.number); setMileInput(""); }}
                        title={`Campaign ${c.number}: ${c.name}`}
                        className={`w-8 h-8 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? "border-roman-gold bg-roman-gold text-stone-950 scale-110 shadow-[0_0_12px_rgba(212,175,55,0.4)]"
                            : s === "complete"
                            ? "border-roman-gold/50 bg-roman-gold/20 text-roman-gold hover:bg-roman-gold/30"
                            : s === "active"
                            ? "border-roman-gold/40 bg-stone-800 text-roman-gold/80 hover:bg-stone-700"
                            : "border-stone-700/50 bg-stone-800/50 text-stone-600 hover:bg-stone-800"
                        }`}
                      >
                        {s === "complete" && !isSelected ? "\u2713" : c.number}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main campaign content */}
              {campaign && (
                <div className="flex-1 flex flex-col lg:flex-row min-h-0">
                  {/* Left: Campaign image */}
                  <div className="lg:w-1/2 shrink-0 relative bg-stone-950 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.06),transparent_70%)]" />
                    {!imgError.has(campaign.number) ? (
                      <img
                        src={campaign.image}
                        alt={campaign.name}
                        className={`w-full h-full object-cover transition-all duration-500 ${status === "locked" ? "grayscale brightness-50 blur-sm scale-105" : ""}`}
                        onError={() => setImgError((prev) => new Set(prev).add(campaign.number))}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-6 p-10 text-center">
                        <div className="w-32 h-32 rounded-full border-2 border-roman-gold/20 bg-roman-gold/5 flex items-center justify-center">
                          <span className="text-6xl">{"\u2694\uFE0F"}</span>
                        </div>
                        <p className="text-roman-gold/40 text-sm uppercase tracking-[0.3em] font-semibold">Image here</p>
                      </div>
                    )}
                    {/* Lock overlay for locked campaigns */}
                    {status === "locked" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-20 h-20 rounded-full bg-stone-950/70 border border-stone-700/60 flex items-center justify-center backdrop-blur-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-9 h-9 text-stone-400">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                          </div>
                          <p className="text-stone-500 text-xs uppercase tracking-[0.3em] font-semibold">Locked</p>
                        </div>
                      </div>
                    )}
                    {/* Campaign number overlay */}
                    <div className="absolute top-6 left-6 flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-serif font-bold text-xl ${
                        status === "complete"
                          ? "bg-roman-gold text-stone-950"
                          : status === "active"
                          ? "bg-roman-gold/20 text-roman-gold border border-roman-gold/50"
                          : "bg-stone-800/80 text-stone-500 border border-stone-700"
                      }`}>
                        {status === "complete" ? "\u2713" : campaign.number}
                      </div>
                    </div>
                  </div>

                  {/* Right: Campaign details */}
                  <div className="lg:w-1/2 flex flex-col px-12 py-10 overflow-y-auto">
                    <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full">
                      {/* Title area */}
                      <div className="mb-10">
                        <p className="text-roman-gold/50 text-sm uppercase tracking-[0.4em] font-semibold mb-4">
                          Campaign {campaign.number} of 12
                        </p>
                        <h1 className="text-stone-50 font-serif text-6xl font-bold leading-[1.05] mb-3">
                          {campaign.name}
                        </h1>
                        <p className="text-roman-gold/70 text-2xl italic font-serif">{campaign.subtitle}</p>
                      </div>

                      {/* Description */}
                      <p className="text-stone-400 text-lg leading-relaxed mb-10">{campaign.description}</p>

                      {/* Progress */}
                      <div className="mb-8">
                        <div className="flex items-baseline justify-between mb-2.5">
                          <p className="text-stone-100 font-serif text-2xl font-bold">
                            {myMiles}<span className="text-stone-500 text-sm font-sans font-normal ml-1">/ {campaign.milesRequired} mi</span>
                          </p>
                          <p className="text-roman-gold/80 font-semibold text-sm">{progress}%</p>
                        </div>
                        <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              status === "complete" ? "bg-roman-gold" : "bg-linear-to-r from-roman-gold/50 to-roman-gold"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Action area */}
                      {status === "locked" && (
                        <div className="py-8 text-center">
                          <span className="text-5xl mb-4 block opacity-40">{"\uD83D\uDD12"}</span>
                          <p className="text-stone-500 text-sm leading-relaxed max-w-xs mx-auto">Complete the previous campaign and watch its end video to unlock this one.</p>
                        </div>
                      )}

                      {status === "active" && !canLogMiles && (
                        <div className="text-center py-4">
                          <button
                            onClick={() => setVideoModal({ src: campaign.startVideo, campaignNumber: campaign.number })}
                            className="group relative overflow-hidden px-10 py-4 rounded-2xl border border-roman-gold/70 bg-linear-to-r from-roman-gold/90 via-amber-300 to-roman-gold/90 text-stone-950 text-sm uppercase tracking-[0.2em] font-bold shadow-[0_0_25px_rgba(212,175,55,0.45)] hover:brightness-110 hover:shadow-[0_0_35px_rgba(212,175,55,0.7)] active:scale-[0.98] transition-all animate-pulse cursor-pointer"
                          >
                            <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            <span className="relative flex items-center gap-3">
                              <span className="text-lg">{"\u23F5"}</span>
                              <span>Watch Intro & Begin</span>
                            </span>
                          </button>
                          <p className="text-stone-600 text-xs mt-4 uppercase tracking-widest">Watch the intro video to start logging miles</p>
                        </div>
                      )}

                      {status === "active" && canLogMiles && (
                        <div>
                          <p className="text-stone-500 text-xs uppercase tracking-[0.25em] font-semibold mb-3">Log Miles</p>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="Miles run..."
                              value={mileInput}
                              onChange={(e) => setMileInput(e.target.value)}
                              className="flex-1 px-4 py-3 rounded-xl bg-stone-800/60 border border-stone-700/60 text-stone-100 text-base placeholder:text-stone-600 focus:outline-none focus:border-roman-gold/50 transition-colors"
                            />
                            <button
                              onClick={() => handleLogMiles(campaign.number, campaign.milesRequired)}
                              disabled={submitting}
                              className="px-6 py-3 rounded-xl bg-roman-gold/15 border border-roman-gold/40 text-roman-gold text-sm uppercase tracking-wider font-bold hover:bg-roman-gold/25 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {submitting ? "Saving..." : "Log"}
                            </button>
                          </div>
                          <p className="text-stone-600 text-xs mt-2">{roundMiles(campaign.milesRequired - myMiles)} miles remaining</p>
                        </div>
                      )}

                      {status === "complete" && (
                        <div className="text-center py-4">
                          <span className="text-5xl mb-4 block">{"\uD83C\uDFC6"}</span>
                          <p className="text-roman-gold font-serif font-bold text-xl mb-4">Campaign Complete!</p>
                          <button
                            onClick={() => setVideoModal({ src: campaign.endVideo, campaignNumber: campaign.number, isEnd: true })}
                            className="px-6 py-3 rounded-xl border border-roman-gold/30 text-roman-gold text-xs uppercase tracking-wider font-semibold hover:bg-roman-gold/10 transition-colors cursor-pointer"
                          >
                            {watchedEndVideos.has(campaign.number)
                              ? "Rewatch End Video"
                              : nextCampaignLocked
                              ? "Watch End Video to Unlock Next"
                              : "Watch End Video"}
                          </button>
                          {!watchedEndVideos.has(campaign.number) && nextCampaignLocked && (
                            <p className="text-stone-500 text-xs mt-4 italic">Watch the end video to unlock the next campaign</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom navigation */}
                    <div className="flex items-center justify-between pt-6 mt-auto border-t border-stone-800/50">
                      <button
                        onClick={() => { setSelectedCampaign((p) => Math.max(1, p - 1)); setMileInput(""); }}
                        disabled={selectedCampaign <= 1}
                        className="flex items-center gap-2 text-stone-500 text-sm font-semibold hover:text-stone-200 transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                      >
                        {"\u2190"} Previous
                      </button>
                      <p className="text-stone-600 text-xs uppercase tracking-[0.25em] font-semibold">
                        {selectedCampaign} / 12
                      </p>
                      <button
                        onClick={() => { setSelectedCampaign((p) => Math.min(12, p + 1)); setMileInput(""); }}
                        disabled={selectedCampaign >= 12}
                        className="flex items-center gap-2 text-roman-gold text-sm font-semibold hover:text-roman-gold/80 transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                      >
                        Next {"\u2192"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Video modal */}
      {videoModal && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={closeVideoModal}
            className="absolute top-5 right-5 z-20 flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-700 text-stone-400 hover:text-stone-100 hover:border-stone-500 text-xs uppercase tracking-widest font-semibold transition-all cursor-pointer bg-black/60"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Close
          </button>
          <div className="flex flex-col items-center w-full h-full">
            <div className="text-center pt-6 pb-4 z-10">
              <p className="text-roman-gold/60 text-[10px] uppercase tracking-[0.35em] font-semibold mb-0.5">
                {videoModal.isEnd ? "End of Campaign" : "Campaign"} {videoModal.campaignNumber}
              </p>
              <h2 className="text-roman-gold font-serif text-xl font-bold tracking-wide roman-glow">
                {CAMPAIGNS[videoModal.campaignNumber - 1].name}
              </h2>
              <p className="text-stone-400 text-xs mt-0.5 italic">
                {CAMPAIGNS[videoModal.campaignNumber - 1].subtitle}
              </p>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center w-full px-4">
              {!isPlayingVideo ? (
                <div className="flex flex-col items-center gap-8">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-roman-gold/10 blur-2xl scale-150" />
                    <button
                      onClick={() => setIsPlayingVideo(true)}
                      className="relative w-28 h-28 rounded-full border-2 border-roman-gold bg-stone-950/80 hover:bg-roman-gold/10 hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-[0_0_60px_rgba(212,175,55,0.25)] cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-roman-gold ml-1.5">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                  </div>
                  <p className="text-stone-500 text-sm tracking-widest uppercase font-semibold">
                    {videoModal.isEnd ? "Watch Closing Video" : "Watch Intro to Begin"}
                  </p>
                </div>
              ) : (
                <video
                  key={videoModal.src}
                  src={videoModal.src}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-full max-w-[min(100%,480px)] rounded-lg shadow-[0_0_80px_rgba(0,0,0,0.8)]"
                  onEnded={handleVideoEnded}
                />
              )}
            </div>
            <div className="w-full px-8 py-4 flex items-center justify-between z-10">
              <p className="text-stone-600 text-xs uppercase tracking-[0.25em] font-semibold">
                {videoModal.isEnd ? "Complete this video to unlock the next campaign" : "Watch this video to begin logging miles"}
              </p>
              {isPlayingVideo && (
                <button
                  onClick={handleVideoEnded}
                  className="px-5 py-2.5 rounded-lg bg-roman-gold/20 border border-roman-gold/50 text-roman-gold text-xs uppercase tracking-wider font-bold hover:bg-roman-gold/30 transition-colors cursor-pointer"
                >
                  Done {"\u2713"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Award modal */}
      {awardModalCampaign !== null && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="w-full max-w-2xl rounded-4xl border border-roman-gold/35 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),rgba(28,25,23,0.96)_45%),linear-gradient(180deg,rgba(41,37,36,0.98),rgba(12,10,9,0.98))] p-8 shadow-[0_30px_120px_rgba(0,0,0,0.7)]">
            <div className="text-center">
              <p className="text-roman-gold/70 text-xs uppercase tracking-[0.35em] font-semibold">Campaign Complete</p>
              <h2 className="mt-3 text-4xl font-serif font-bold text-stone-50">
                {student?.displayName ?? "Warrior"} has earned their rewards
              </h2>
              <p className="mt-3 text-stone-300 text-base leading-7 max-w-xl mx-auto">
                Campaign {awardModalCampaign} is complete. Award the student their medal and certificate for finishing
                {" "}{CAMPAIGNS[awardModalCampaign - 1].name}.
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-roman-gold/25 bg-roman-gold/10 p-6 text-center">
                <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full border border-roman-gold/45 bg-roman-gold/15 text-4xl text-roman-gold">{"\uD83C\uDFC5"}</div>
                <p className="mt-4 text-xs uppercase tracking-[0.28em] text-roman-gold/70 font-semibold">Medal Awarded</p>
                <p className="mt-2 text-2xl font-serif font-bold text-stone-50">{getCampaignMedalName(awardModalCampaign)}</p>
                <p className="mt-2 text-sm leading-6 text-stone-300">Present this medal to recognize the miles, discipline, and completion of this campaign.</p>
              </div>
              <div className="rounded-3xl border border-stone-600/70 bg-stone-900/70 p-6 text-center">
                <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-full border border-stone-500/70 bg-stone-800/80 text-4xl text-stone-100">{"\uD83D\uDCDC"}</div>
                <p className="mt-4 text-xs uppercase tracking-[0.28em] text-roman-gold/70 font-semibold">Certificate Earned</p>
                <p className="mt-2 text-2xl font-serif font-bold text-stone-50">Completion Certificate</p>
                <p className="mt-2 text-sm leading-6 text-stone-300">The student has unlocked their certificate for successfully finishing the campaign end sequence.</p>
              </div>
            </div>
            <div className="mt-8 flex items-center justify-center">
              <button
                onClick={() => {
                  const isFinalCampaign = awardModalCampaign === 12;
                  setAwardModalCampaign(null);
                  if (isFinalCampaign) setShowGrandFinale(true);
                }}
                className="px-5 py-3 rounded-xl border border-stone-600 bg-stone-900/70 text-stone-100 text-sm uppercase tracking-[0.18em] font-semibold hover:border-stone-400 hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Grand Finale - Scutum Shield Reveal */}
      {showGrandFinale && (
        <div className="fixed inset-0 z-70 bg-black flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08),transparent_50%)]" />
          <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-3xl">
            <div className="relative mb-8">
              <div className="absolute inset-0 rounded-full bg-roman-gold/20 blur-3xl scale-[2]" />
              <div className="absolute inset-0 rounded-full bg-roman-gold/10 blur-xl scale-[3] animate-pulse" />
              <div className="relative w-40 h-40 rounded-full border-4 border-roman-gold bg-linear-to-b from-roman-gold/30 to-roman-gold/5 flex items-center justify-center shadow-[0_0_80px_rgba(212,175,55,0.5),0_0_160px_rgba(212,175,55,0.2)]">
                <span className="text-8xl">{"\u{1F6E1}\uFE0F"}</span>
              </div>
            </div>
            <p className="text-roman-gold/60 text-xs uppercase tracking-[0.5em] font-semibold mb-6 animate-pulse">All XII Campaigns Complete</p>
            <h1 className="text-stone-50 font-serif text-6xl md:text-7xl font-bold leading-[1.05] mb-4">
              Ultimate Warrior
            </h1>
            <p className="text-roman-gold font-serif text-3xl md:text-4xl italic mb-8">
              {student?.displayName ?? "Warrior"}
            </p>
            <div className="w-24 h-px bg-linear-to-r from-transparent via-roman-gold/60 to-transparent mb-8" />
            <p className="text-stone-300 text-lg md:text-xl leading-relaxed max-w-xl mb-4">
              You have conquered every campaign, marched {TOTAL_MILES} miles, and proven yourself worthy of the highest honour.
            </p>
            <p className="text-roman-gold/80 text-xl md:text-2xl font-serif font-bold mb-10">
              You are now awarded the legendary Scutum Shield.
            </p>
            <div className="flex flex-col items-center gap-6">
              <div className="rounded-3xl border-2 border-roman-gold/40 bg-roman-gold/10 px-10 py-6 shadow-[0_0_60px_rgba(212,175,55,0.25)]">
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{"\u{1F6E1}\uFE0F"}</span>
                  <div className="text-left">
                    <p className="text-xs uppercase tracking-[0.3em] text-roman-gold/70 font-semibold">Highest Honour</p>
                    <p className="text-3xl font-serif font-bold text-stone-50">The Scutum Shield</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowGrandFinale(false)}
                className="mt-4 px-8 py-3 rounded-xl border border-roman-gold/40 bg-roman-gold/15 text-roman-gold text-sm uppercase tracking-[0.2em] font-bold hover:bg-roman-gold/25 transition-colors cursor-pointer"
              >
                Glory to Rome
              </button>
            </div>
          </div>
          <GrandFinaleConfetti />
        </div>
      )}
    </div>
  );
}

function GrandFinaleConfetti() {
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;
    // Initial big bursts
    confetti({ particleCount: 150, spread: 180, startVelocity: 60, origin: { x: 0.5, y: 0.4 }, colors: ["#d4af37", "#ffd700", "#b8860b", "#fff8dc", "#fffacd"] });
    confetti({ particleCount: 80, spread: 120, startVelocity: 50, origin: { x: 0.2, y: 0.6 }, colors: ["#d4af37", "#ffd700", "#b8860b"] });
    confetti({ particleCount: 80, spread: 120, startVelocity: 50, origin: { x: 0.8, y: 0.6 }, colors: ["#d4af37", "#ffd700", "#b8860b"] });
    // Sustained shower
    const frame = () => {
      confetti({ particleCount: 8, angle: 60, spread: 80, startVelocity: 50, origin: { x: 0, y: 0.5 }, colors: ["#d4af37", "#ffd700", "#b8860b", "#fff8dc"] });
      confetti({ particleCount: 8, angle: 120, spread: 80, startVelocity: 50, origin: { x: 1, y: 0.5 }, colors: ["#d4af37", "#ffd700", "#b8860b", "#fff8dc"] });
      confetti({ particleCount: 4, angle: 90, spread: 140, startVelocity: 40, origin: { x: 0.5, y: 0.3 }, colors: ["#d4af37", "#ffd700", "#fff8dc", "#fffacd"] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);
  return null;
}

