import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const KEY_POINTS = [
  {
    icon: "🏃",
    title: "Get Moving!",
    body: "Every step counts! Walk, jog, or run — all your miles add up to help you complete this campaign.",
  },
  {
    icon: "📏",
    title: "Track Your Miles",
    body: "Every time you exercise, your teacher will log your miles. Watch your progress bar grow!",
  },
  {
    icon: "⭐",
    title: "Earn Your Reward",
    body: "Finish Campaign 1 and you'll unlock the next adventure. Keep going and become an Ultimate Warrior!",
  },
  {
    icon: "🤝",
    title: "Team Spirit",
    body: "You're not alone! Your whole class is on this journey together. Cheer each other on and have fun!",
  },
];

export default function TheBeginning() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [miles, setMiles] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSaveMiles() {
    if (!miles || isNaN(Number(miles)) || Number(miles) < 0) return;
    // TODO: persist to Firestore
    setSaved(true);
  }

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col">
      <Navbar />

      <div className="flex-1 w-full px-14 py-14">
        {/* Header */}
        <div className="mb-10 text-center">
          <p className="text-roman-gold/50 uppercase tracking-[0.3em] text-xs font-medium mb-3">
            Campaign 1
          </p>
          <h1 className="font-serif text-5xl font-bold text-stone-100 mb-3">
            The Beginning
          </h1>
          <p className="text-stone-400 text-lg">
            Move your body, track your progress, and become an Ultimate Warrior!
          </p>
        </div>

        {/* Step indicator */}
        <div className="mx-auto max-w-4xl flex items-center justify-center gap-2 mb-8">
          {["Intro", "Key Points", "Log Miles"].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs uppercase tracking-wider font-medium transition-all ${
                step === i
                  ? "bg-roman-gold/20 text-roman-gold border border-roman-gold/40"
                  : "text-stone-600 border border-stone-700/40"
              }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step > i ? "bg-roman-gold/60 text-stone-950" : step === i ? "bg-roman-gold text-stone-950" : "bg-stone-700 text-stone-500"
                }`}>{i + 1}</span>
                {label}
              </div>
              {i < 2 && <div className={`w-8 h-px ${step > i ? "bg-roman-gold/40" : "bg-stone-700/40"}`} />}
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-4xl">
          {step === 0 ? (
            /* ── Step 0: Intro video ── */
            <div className="relative w-full aspect-video rounded-2xl border border-roman-gold/20 bg-stone-950 overflow-hidden flex items-center justify-center shadow-[0_0_60px_rgba(0,0,0,0.5)]">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-roman-gold/50 to-transparent" />
              <div className="text-center select-none">
                <div className="mx-auto mb-4 w-20 h-20 rounded-full border-2 border-roman-gold/40 bg-roman-gold/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-roman-gold ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="text-roman-gold/60 uppercase tracking-[0.3em] text-xs font-medium">
                  Intro Video Here
                </p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-roman-gold/50 to-transparent" />
            </div>
          ) : step === 1 ? (
            /* ── Step 1: Key points ── */
            <div className="w-full aspect-video grid grid-cols-2 gap-5" style={{animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1) both"}}>
              <style>{`@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
              {KEY_POINTS.map((kp, i) => (
                <div
                  key={i}
                  className="bg-stone-950/60 border border-stone-700/40 hover:border-roman-gold/30 rounded-2xl p-7 transition-colors"
                  style={{animationDelay: `${i * 60}ms`}}
                >
                  <div className="text-3xl mb-4">{kp.icon}</div>
                  <h3 className="font-serif text-xl font-bold text-stone-100 mb-2">{kp.title}</h3>
                  <p className="text-stone-400 text-base leading-relaxed">{kp.body}</p>
                </div>
              ))}
            </div>
          ) : (
            /* ── Step 2: Log miles ── */
            <div className="w-full aspect-video" style={{animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1) both"}}>
              <style>{`@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
              <div className="w-full h-full bg-gradient-to-b from-stone-950/80 to-stone-900/60 border border-stone-700/40 rounded-2xl overflow-hidden flex flex-col">
                {/* Gold top accent */}
                <div className="h-1 w-full bg-gradient-to-r from-transparent via-roman-gold/50 to-transparent" />

                <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                  {saved ? (
                    <div className="flex flex-col items-center gap-6" style={{animation: "slideUp 0.25s cubic-bezier(0.32,0.72,0,1) both"}}>
                      <div className="w-24 h-24 rounded-full bg-roman-gold/15 border-2 border-roman-gold shadow-[0_0_30px_rgba(212,175,55,0.25)] flex items-center justify-center">
                        <span className="text-5xl">⭐</span>
                      </div>
                      <div>
                        <p className="text-roman-gold font-bold text-3xl mb-2">Miles Logged!</p>
                        <p className="text-stone-400 text-lg">{miles} mile{Number(miles) !== 1 ? "s" : ""} recorded successfully</p>
                      </div>
                      <button
                        onClick={() => { setSaved(false); setMiles(""); }}
                        className="mt-2 px-6 py-3 rounded-xl border border-stone-700/50 text-stone-300 text-base hover:border-roman-gold/50 hover:text-roman-gold transition-all cursor-pointer active:scale-95"
                      >
                        Log more miles
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-roman-gold/10 border border-roman-gold/30 mb-5">
                          <span className="text-4xl">📏</span>
                        </div>
                        <h2 className="font-serif text-4xl font-bold text-stone-100 mb-2">Log Today's Miles</h2>
                        <p className="text-stone-400 text-lg max-w-md mx-auto">Enter how far this student ran, walked, or jogged today.</p>
                      </div>

                      <div className="w-full max-w-md space-y-5">
                        {/* Quick-add buttons */}
                        <div className="flex items-center justify-center gap-3">
                          {[0.25, 0.5, 0.75, 1].map(val => (
                            <button
                              key={val}
                              onClick={() => setMiles(String(val))}
                              className={`px-5 py-2.5 rounded-xl text-base font-medium transition-all cursor-pointer active:scale-95 ${
                                miles === String(val)
                                  ? "bg-roman-gold/20 border border-roman-gold/50 text-roman-gold"
                                  : "bg-stone-800/50 border border-stone-700/40 text-stone-400 hover:border-roman-gold/30 hover:text-roman-gold"
                              }`}
                            >
                              {val} mi
                            </button>
                          ))}
                        </div>

                        {/* Custom input */}
                        <div className="w-full flex flex-col items-center bg-stone-900/80 border border-stone-700/50 focus-within:border-roman-gold/60 focus-within:shadow-[0_0_15px_rgba(212,175,55,0.1)] rounded-xl px-6 py-5 transition-all">
                          <div className="flex items-baseline gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              placeholder="0.0"
                              value={miles}
                              onChange={e => setMiles(e.target.value)}
                              className="w-32 bg-transparent text-4xl font-bold text-stone-100 outline-none placeholder:text-stone-600 text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <span className="text-stone-500 text-xl font-medium">miles</span>
                          </div>
                        </div>

                        {/* Save button */}
                        <button
                          onClick={handleSaveMiles}
                          disabled={!miles || isNaN(Number(miles)) || Number(miles) <= 0}
                          className="w-full py-5 rounded-xl bg-roman-gold text-stone-950 font-bold text-xl hover:brightness-110 hover:shadow-[0_4px_20px_rgba(212,175,55,0.4)] transition-all active:scale-95 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:hover:shadow-none"
                        >
                          Save Miles
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={() => step === 0 ? navigate('/campaigns') : setStep(s => s - 1)}
              className="group flex items-center gap-3 px-8 py-4 rounded-xl border border-stone-700/50 bg-stone-800/30 text-stone-300 text-lg hover:border-roman-gold/50 hover:text-roman-gold hover:bg-stone-800/60 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <svg className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </button>

            <button
              onClick={() => step < 2 ? setStep(s => s + 1) : navigate('/campaigns')}
              disabled={step === 2 && !saved}
              className="group flex items-center gap-3 px-8 py-4 rounded-xl bg-roman-gold text-stone-950 font-bold text-lg hover:brightness-110 hover:shadow-[0_4px_20px_rgba(212,175,55,0.4)] transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:hover:shadow-none"
            >
              <span>{step === 2 ? "Finish" : "Next"}</span>
              <svg className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}