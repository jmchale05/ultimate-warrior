import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { StudentCampaignSkeleton } from "../components/LoadingSpinner";
import { getUserDoc, getResultsByStudent, submitResult, updateUserPhoto } from "../lib/firestore";
import type { AppUser, Result } from "../types";

const CAMPAIGNS = [
  { number: 1,  name: "The Beginning",            subtitle: "Mars God of War",              milesRequired: 1,  startVideo: "/beginning.mars.mov", endVideo: "/end.mars.mov" },
  { number: 2,  name: "The Foundations",           subtitle: "Romulus & Remus",              milesRequired: 2,  startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4" },
  { number: 3,  name: "The Emperor",               subtitle: "Augustus",                     milesRequired: 3,  startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4" },
  { number: 4,  name: "The Legion",                subtitle: "Domination of the Roman Army", milesRequired: 4,  startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4" },
  { number: 5,  name: "The Empire",                subtitle: "Trajan",                       milesRequired: 5,  startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4" },
  { number: 6,  name: "The Hero",                  subtitle: "Markus Aurelius",              milesRequired: 6,  startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4" },
  { number: 7,  name: "The Wall",                  subtitle: "Hadrian",                      milesRequired: 7,  startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4" },
  { number: 8,  name: "The Restorer of The World", subtitle: "Aurelian",                     milesRequired: 8,  startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4" },
  { number: 9,  name: "The Enemy",                 subtitle: "Hannibal",                     milesRequired: 9,  startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4" },
  { number: 10, name: "The Gladiator",             subtitle: "Spartacus",                    milesRequired: 10, startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4" },
  { number: 11, name: "The Fall of Rome",          subtitle: "Barbarian Invasion",           milesRequired: 11, startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4" },
  { number: 12, name: "The Voice of Rome",         subtitle: "Julius Caesar",                milesRequired: 12, startVideo: "/roman-vid.mp4", endVideo: "/roman-vid.mp4" },
];

const TOTAL_MILES = 78; // 1+2+...+12

function roundMiles(value: number) {
  return Math.round(value * 10) / 10;
}

export default function StudentCampaign() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<AppUser | null>(null);
  const [campaignMiles, setCampaignMiles] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [videoModal, setVideoModal] = useState<{ src: string; campaignNumber: number; isEnd?: boolean } | null>(null);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [watchedCampaigns, setWatchedCampaigns] = useState<Set<number>>(new Set());
  const [watchedEndVideos, setWatchedEndVideos] = useState<Set<number>>(new Set());
  const [mileInputs, setMileInputs] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
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
    const input = parseFloat(mileInputs[campaignNumber] ?? "");
    if (!input || input <= 0 || !uid || !student) return;
    const already = campaignMiles[campaignNumber] ?? 0;
    const remaining = milesRequired - already;
    const toLog = roundMiles(Math.min(input, remaining));
    if (toLog <= 0) return;
    setSubmitting(campaignNumber);
    await submitResult({
      challengeId: `campaign-${campaignNumber}`,
      studentId: uid,
      classId: student.classId ?? "",
      distanceMiles: toLog,
      completedAt: Date.now(),
    });
    setCampaignMiles((prev) => ({ ...prev, [campaignNumber]: already + toLog }));
    setMileInputs((prev) => ({ ...prev, [campaignNumber]: "" }));
    setSubmitting(null);
  }

  useEffect(() => {
    if (!uid) return;

    async function loadData() {
      setLoading(true);
      const [user, results] = await Promise.all([
        getUserDoc(uid!),
        getResultsByStudent(uid!),
      ]);
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
      setLoading(false);
    }

    loadData();
  }, [uid]);

  const totalMiles = CAMPAIGNS.reduce((sum, c) => sum + Math.min(campaignMiles[c.number] ?? 0, c.milesRequired), 0);
  const overallProgress = Math.min(100, Math.round((totalMiles / TOTAL_MILES) * 100));

  function getCampaignStatus(c: typeof CAMPAIGNS[0]) {
    const myMiles = campaignMiles[c.number] ?? 0;
    if (myMiles >= c.milesRequired) return "complete";
    const prevComplete =
      c.number === 1 ||
      ((campaignMiles[c.number - 1] ?? 0) >= (c.number - 1) && watchedEndVideos.has(c.number - 1));
    if (prevComplete) return "active";
    return "locked";
  }

  function getCampaignProgress(c: typeof CAMPAIGNS[0]) {
    const myMiles = campaignMiles[c.number] ?? 0;
    return Math.min(100, Math.round((myMiles / c.milesRequired) * 100));
  }

  function closeVideoModal() {
    if (isPlayingVideo && videoModal) {
      if (videoModal.isEnd) {
        setWatchedEndVideos((prev) => new Set(prev).add(videoModal.campaignNumber));
      } else {
        setWatchedCampaigns((prev) => new Set(prev).add(videoModal.campaignNumber));
      }
    }
    setVideoModal(null);
    setIsPlayingVideo(false);
  }

  return (
    <div className="h-screen bg-stone-900 text-stone-100 flex flex-col overflow-hidden">
      <Navbar />

      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* Left side image */}
        <div className="w-32 shrink-0 select-none pointer-events-none" style={{
          backgroundImage: 'url("/SIDE.png")',
          backgroundRepeat: 'repeat-y',
          backgroundSize: '100% auto',
        }} />

        <div className="flex-1 min-h-0 w-full px-14 py-10 overflow-y-auto overflow-x-hidden">
        {/* Back button */}
        <button
          onClick={() => navigate("/campaigns")}
          className="flex items-center gap-2 text-stone-500 hover:text-roman-gold transition-colors mb-8 text-base uppercase tracking-wider font-semibold cursor-pointer"
        >
          ← Back to Legion
        </button>

        {loading ? (
          <StudentCampaignSkeleton />
        ) : (
          <>
            {/* Student header */}
            <div className="flex items-end justify-between mb-10">
              <div className="flex items-center gap-6">
                {/* Avatar */}
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-full border-2 border-roman-gold/30 overflow-hidden bg-stone-800 flex items-center justify-center">
                    {student?.photoUrl ? (
                      <img
                        src={student.photoUrl}
                        alt={student.displayName}
                        className="w-full h-full object-cover"
                      />
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
                    {photoUploading ? (
                      <svg className="roman-btn-spinner w-5 h-5 text-roman-gold" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="50 20" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-roman-gold">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    )}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
                <div>
                  <p className="text-roman-gold/50 text-sm uppercase tracking-[0.25em] font-semibold mb-1">
                    Campaign Progress
                  </p>
                  <h1 className="text-stone-100 font-serif text-5xl font-bold">
                    {student?.displayName ?? "Unknown Warrior"}
                  </h1>
                  {student?.age && (
                    <p className="text-stone-500 text-base mt-1">Age {student.age}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-roman-gold/50 text-sm uppercase tracking-[0.25em] font-semibold mb-1">Total Miles</p>
                <p className="text-roman-gold font-serif text-5xl font-bold">{totalMiles.toFixed(1)}</p>
                <p className="text-stone-500 text-base">of {TOTAL_MILES} mi</p>
              </div>
            </div>

            {/* Overall progress bar */}
            <div className="mb-10">
              <div className="flex justify-between text-sm uppercase tracking-widest text-stone-500 font-semibold mb-2">
                <span>Overall Journey</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="h-3 rounded-full bg-stone-700/70 overflow-hidden border border-stone-600/30">
                <div
                  className="h-full bg-linear-to-r from-roman-gold/60 to-roman-gold rounded-full transition-all duration-700"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            {/* Campaign list */}
            <div className="space-y-3">
              {CAMPAIGNS.map((c) => {
                const status = getCampaignStatus(c);
                const progress = getCampaignProgress(c);
                return (
                  <div
                    key={c.number}
                    className={`rounded-xl border px-8 py-5 transition-all ${
                      status === "complete"
                        ? "border-roman-gold/40 bg-roman-gold/5"
                        : status === "active"
                        ? "border-roman-gold/60 bg-roman-gold/10 shadow-[0_0_20px_rgba(212,175,55,0.08)]"
                        : "border-stone-700/40 bg-stone-800/20 opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      {/* Number */}
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-serif font-bold text-xl shrink-0 ${
                        status === "complete"
                          ? "bg-roman-gold text-stone-950"
                          : status === "active"
                          ? "bg-roman-gold/20 text-roman-gold border border-roman-gold/50"
                          : "bg-stone-700/50 text-stone-600"
                      }`}>
                        {status === "complete" ? "✓" : c.number}
                      </div>

                      {/* Name & miles range */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className={`font-semibold text-lg ${
                              status === "locked" ? "text-stone-600" : "text-stone-100"
                            }`}>
                              {c.name}
                            </span>
                            <p className={`text-sm mt-0.5 ${
                              status === "locked" ? "text-stone-700" : "text-stone-400"
                            }`}>{c.subtitle}</p>
                          </div>
                          <span className="text-stone-500 text-base font-mono shrink-0 ml-4">
                            {campaignMiles[c.number] ?? 0}/{c.milesRequired} mi
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-stone-700/60 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              status === "complete"
                                ? "bg-roman-gold"
                                : "bg-linear-to-r from-roman-gold/50 to-roman-gold"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className="w-24 text-right shrink-0">
                        {status === "complete" && (
                          <span className="text-sm uppercase tracking-widest text-roman-gold font-semibold">Complete</span>
                        )}
                        {status === "active" && (
                          <span className="text-sm uppercase tracking-widest text-roman-gold/70 font-semibold">{progress}%</span>
                        )}
                        {status === "locked" && (
                          <span className="text-sm uppercase tracking-widest text-stone-600 font-semibold">Locked</span>
                        )}
                      </div>
                    </div>

                    {(status === "active" || status === "complete") && (
                      <div className="mt-4 border-t border-stone-700/40 pt-4 flex flex-wrap gap-2">
                        {status === "active" && (
                          watchedCampaigns.has(c.number) || (campaignMiles[c.number] ?? 0) > 0 ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="Miles run..."
                                value={mileInputs[c.number] ?? ""}
                                onChange={(e) => setMileInputs((prev) => ({ ...prev, [c.number]: e.target.value }))}
                                className="w-36 px-3 py-2 rounded-lg bg-stone-800 border border-stone-600 text-stone-100 text-sm placeholder:text-stone-600 focus:outline-none focus:border-roman-gold/60"
                              />
                              <button
                                onClick={() => handleLogMiles(c.number, c.milesRequired)}
                                disabled={submitting === c.number}
                                className="px-4 py-2 rounded-lg bg-roman-gold/20 border border-roman-gold/50 text-roman-gold text-xs uppercase tracking-wider font-semibold hover:bg-roman-gold/30 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {submitting === c.number ? "Saving..." : "Log Miles"}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setVideoModal({ src: c.startVideo, campaignNumber: c.number })}
                              className="group relative overflow-hidden px-4 py-2.5 rounded-lg border border-roman-gold/70 bg-linear-to-r from-roman-gold/90 via-amber-300 to-roman-gold/90 text-stone-950 text-xs uppercase tracking-[0.18em] font-bold shadow-[0_0_18px_rgba(212,175,55,0.45)] hover:brightness-110 hover:shadow-[0_0_28px_rgba(212,175,55,0.7)] active:scale-[0.98] transition-all animate-pulse cursor-pointer"
                            >
                              <span className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                              <span className="relative flex items-center gap-2">
                                <span>⏵</span>
                                <span>Begin Campaign</span>
                              </span>
                            </button>
                          )
                        )}
                        {status === "complete" && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setVideoModal({ src: c.endVideo, campaignNumber: c.number, isEnd: true })}
                              className="px-3 py-2 rounded-lg border border-roman-gold/40 text-roman-gold text-xs uppercase tracking-wider font-semibold hover:bg-roman-gold/10 transition-colors cursor-pointer"
                            >
                              {watchedEndVideos.has(c.number) ? "Rewatch End Video" : "Watch End Video"}
                            </button>
                            {!watchedEndVideos.has(c.number) && c.number < 12 && (
                              <span className="text-stone-500 text-xs italic">Watch end video to unlock next campaign</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {videoModal && (
              <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
                {/* Close button */}
                <button
                  onClick={closeVideoModal}
                  className="absolute top-5 right-5 z-20 flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-700 text-stone-400 hover:text-stone-100 hover:border-stone-500 text-xs uppercase tracking-widest font-semibold transition-all cursor-pointer bg-black/60"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Close
                </button>

                {/* Center content */}
                <div className="flex flex-col items-center w-full h-full">
                  {/* Title header */}
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

                  {/* Video area — portrait-optimized */}
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
                        onEnded={closeVideoModal}
                      />
                    )}
                  </div>

                  {/* Bottom bar */}
                  <div className="w-full px-8 py-4 flex items-center justify-between z-10">
                    <p className="text-stone-600 text-xs uppercase tracking-[0.25em] font-semibold">
                      {videoModal.isEnd ? "Complete this video to unlock the next campaign" : "Watch this video to begin logging miles"}
                    </p>
                    {isPlayingVideo && (
                      <button
                        onClick={closeVideoModal}
                        className="px-5 py-2.5 rounded-lg bg-roman-gold/20 border border-roman-gold/50 text-roman-gold text-xs uppercase tracking-wider font-bold hover:bg-roman-gold/30 transition-colors cursor-pointer"
                      >
                        Done ✓
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

        {/* Right side image */}
        <div className="w-32 shrink-0 select-none pointer-events-none" style={{
          backgroundImage: 'url("/SIDE.png")',
          backgroundRepeat: 'repeat-y',
          backgroundSize: '100% auto',
          transform: 'scaleX(-1)',
        }} />
      </div>
    </div>
  );
}
