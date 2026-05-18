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
    <div className="min-h-screen bg-gray-100 px-6 py-8 md:px-10" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <div className="mx-auto max-w-5xl">
        <header className="bg-white border border-gray-300 shadow-sm px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest" style={{ fontFamily: "system-ui, sans-serif" }}>Legal Document</p>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mt-1">Privacy Notice</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(appUser ? (appUser.role === "admin" ? "/admin" : "/campaigns") : "/login")}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:text-gray-900 hover:border-gray-500 transition-colors"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              {appUser ? "Back to App" : "Back to Login"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/terms")}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:text-gray-900 hover:border-gray-500 transition-colors"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              Terms and Conditions
            </button>
          </div>
        </header>

        <main className="mt-6 bg-white border border-gray-300 shadow-md px-8 py-10 md:px-12 md:py-12">
          <div className="border-b border-gray-200 pb-7 mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Data Protection and Your Rights</h2>
            <p className="mt-3 text-sm text-gray-500" style={{ fontFamily: "system-ui, sans-serif" }}>
              Ultimate Warrior Challenges · Effective Date: May 2026
            </p>
          </div>

          <section className="mb-8">
            <p className="text-gray-700 leading-relaxed text-[15px]">
              Ultimate Warrior Challenges processes teacher and student data to administer school fitness campaigns, track progress, and manage access.
              Teachers must confirm they have lawful authority and any required school or parental permissions before entering student data.
            </p>
          </section>

          <section className="space-y-8 text-[15px] leading-relaxed text-gray-700">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">1. What We Store</h3>
              <p>
                Account details such as email, display name, role, school membership, consent timestamps, student profile details entered by teachers,
                student progress results, and school branding assets.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">2. Why We Process It</h3>
              <p>
                To provide account access, assign schools and year groups, run campaigns, measure progress, review deletion requests, and support safeguarding and audit needs.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">3. Retention and Deletion</h3>
              <p>
                Student deletion requests are reviewed by an admin. Once approved, the app permanently deletes the student profile and related results, while keeping a minimal audit log for safeguarding and compliance.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">4. Your Rights</h3>
              <p>
                You can request access to your data, correction of inaccurate details, deletion where applicable, and restriction of processing by contacting support.
              </p>
            </div>
          </section>

          <section className="mt-10 border-t border-gray-200 pt-7">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Contact and Requests</h3>
            <p className="text-gray-700 text-[15px] leading-relaxed">
              For privacy requests, deletion issues, or data correction, contact support@tuwc.online. Teachers should only upload student information they are authorised to manage.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="mailto:support@tuwc.online?subject=Privacy%20Request"
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:text-gray-900 hover:border-gray-500 transition-colors"
                style={{ fontFamily: "system-ui, sans-serif" }}
              >
                Email Privacy Support
              </a>
              {appUser && (
                <button
                  type="button"
                  onClick={handleExportMyData}
                  disabled={exporting}
                  className="px-4 py-2 border border-gray-700 bg-gray-800 text-white text-sm hover:bg-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ fontFamily: "system-ui, sans-serif" }}
                >
                  {exporting ? "Preparing Export..." : "Download My Data"}
                </button>
              )}
            </div>
            {exportError && (
              <p className="mt-3 text-sm text-red-700" style={{ fontFamily: "system-ui, sans-serif" }}>{exportError}</p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}