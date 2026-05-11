import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { exportUserData } from "../lib/firestore";

export default function PrivacyPage() {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  async function handleExportMyData() {
    if (!appUser) return;

    setExporting(true);
    setExportError("");
    try {
      const payload = await exportUserData(appUser.uid);
      const blob = new Blob(
        [
          JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              userId: appUser.uid,
              data: payload,
            },
            null,
            2
          ),
        ],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ultimate-warrior-data-${appUser.uid}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export user data:", error);
      setExportError("Could not export your data right now. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 px-6 py-10 md:px-10">
      <div className="mx-auto max-w-4xl rounded-3xl border border-roman-gold/20 bg-stone-900/80 shadow-2xl overflow-hidden">
        <div className="h-1 w-full bg-linear-to-r from-transparent via-roman-gold to-transparent" />
        <div className="px-8 py-8 md:px-12 md:py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-roman-gold/70 text-xs uppercase tracking-[0.35em] font-semibold">Privacy Notice</p>
              <h1 className="text-3xl md:text-4xl font-serif text-roman-gold font-bold mt-2">Data protection and your rights</h1>
            </div>
            <button
              type="button"
              onClick={() => navigate(appUser ? (appUser.role === "admin" ? "/admin" : "/campaigns") : "/login")}
              className="px-4 py-2 rounded-lg border border-roman-gold/40 text-roman-gold text-sm uppercase tracking-wider font-semibold hover:bg-roman-gold/10 transition-colors"
            >
              {appUser ? "Back to App" : "Back to Login"}
            </button>
          </div>

          <p className="mt-6 text-stone-300 leading-relaxed">
            Ultimate Warrior Challenges processes teacher and student data to administer school fitness campaigns, track progress, and manage access.
            Teachers must confirm they have lawful authority and any required school or parental permissions before entering student data.
          </p>

          <div className="grid gap-4 mt-8 md:grid-cols-2">
            <section className="rounded-2xl border border-stone-700/60 bg-stone-950/60 p-5">
              <h2 className="text-roman-gold font-semibold text-lg mb-3">What we store</h2>
              <p className="text-stone-300 text-sm leading-relaxed">
                Account details such as email, display name, role, school membership, consent timestamps, student profile details entered by teachers,
                student progress results, and school branding assets.
              </p>
            </section>
            <section className="rounded-2xl border border-stone-700/60 bg-stone-950/60 p-5">
              <h2 className="text-roman-gold font-semibold text-lg mb-3">Why we process it</h2>
              <p className="text-stone-300 text-sm leading-relaxed">
                To provide account access, assign schools and year groups, run campaigns, measure progress, review deletion requests, and support safeguarding and audit needs.
              </p>
            </section>
            <section className="rounded-2xl border border-stone-700/60 bg-stone-950/60 p-5">
              <h2 className="text-roman-gold font-semibold text-lg mb-3">Retention and deletion</h2>
              <p className="text-stone-300 text-sm leading-relaxed">
                Student deletion requests are reviewed by an admin before permanent removal. Once approved, the app removes the student profile and related results from Firebase.
              </p>
            </section>
            <section className="rounded-2xl border border-stone-700/60 bg-stone-950/60 p-5">
              <h2 className="text-roman-gold font-semibold text-lg mb-3">Your rights</h2>
              <p className="text-stone-300 text-sm leading-relaxed">
                You can request access to your data, correction of inaccurate details, deletion where applicable, and restriction of processing by contacting support.
              </p>
            </section>
          </div>

          <div className="mt-8 rounded-2xl border border-roman-gold/20 bg-roman-gold/10 p-5">
            <h2 className="text-roman-gold font-semibold text-lg mb-3">Contact and requests</h2>
            <p className="text-stone-200 text-sm leading-relaxed">
              For privacy requests, deletion issues, or data correction, contact support@tuwc.online. Teachers should only upload student information they are authorised to manage.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="mailto:support@tuwc.online?subject=Privacy%20Request"
                className="px-4 py-2 rounded-lg border border-roman-gold/40 text-roman-gold text-xs uppercase tracking-wider font-semibold hover:bg-roman-gold/10 transition-colors"
              >
                Email privacy support
              </a>
              {appUser && (
                <button
                  type="button"
                  onClick={handleExportMyData}
                  disabled={exporting}
                  className="px-4 py-2 rounded-lg bg-roman-gold text-stone-950 text-xs uppercase tracking-wider font-bold hover:bg-roman-gold-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {exporting ? "Preparing export..." : "Download my data"}
                </button>
              )}
            </div>
            {exportError && (
              <p className="mt-3 text-red-300 text-sm">{exportError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}