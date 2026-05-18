import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import privacyNotice from "../../docs/PRIVACY_NOTICE.md?raw";
import retentionPolicy from "../../docs/DATA_RETENTION_POLICY.md?raw";
import rightsGuide from "../../docs/DATA_SUBJECT_RIGHTS_GUIDE.md?raw";
import breachPlan from "../../docs/BREACH_RESPONSE_PLAN.md?raw";
import checklist from "../../docs/GDPR_COMPLIANCE_CHECKLIST.md?raw";
import controllerAgreement from "../../docs/DATA_CONTROLLER_PROCESSOR_AGREEMENT.md?raw";
import docsOverview from "../../docs/README.md?raw";
import testerScript from "../../docs/TESTER_SCRIPT.md?raw";

interface PolicyDoc {
  id: string;
  title: string;
  category: string;
  content: string;
}

/** Render raw markdown as simple HTML-like paragraphs for readability */
function renderMarkdown(raw: string): { type: "h1" | "h2" | "h3" | "p" | "hr"; text: string }[] {
  return raw
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("### ")) return { type: "h3" as const, text: trimmed.slice(4) };
      if (trimmed.startsWith("## ")) return { type: "h2" as const, text: trimmed.slice(3) };
      if (trimmed.startsWith("# ")) return { type: "h1" as const, text: trimmed.slice(2) };
      if (trimmed === "---" || trimmed === "***") return { type: "hr" as const, text: "" };
      return { type: "p" as const, text: trimmed };
    })
    .filter((l) => l.type !== "p" || l.text.length > 0);
}

export default function TermsConditionsPage() {
  const navigate = useNavigate();

  const docs = useMemo<PolicyDoc[]>(
    () => [
      { id: "overview", title: "Documentation Overview", category: "General", content: docsOverview },
      { id: "privacy", title: "Privacy Notice", category: "Data Protection", content: privacyNotice },
      { id: "retention", title: "Data Retention Policy", category: "Data Protection", content: retentionPolicy },
      { id: "rights", title: "Data Subject Rights Guide", category: "Data Protection", content: rightsGuide },
      { id: "breach", title: "Breach Response Plan", category: "Security", content: breachPlan },
      { id: "checklist", title: "GDPR Compliance Checklist", category: "Compliance", content: checklist },
      { id: "controller", title: "Controller Processor Agreement", category: "Legal", content: controllerAgreement },
      { id: "testing", title: "Tester Script", category: "Operations", content: testerScript },
    ],
    []
  );

  const [activeId, setActiveId] = useState(docs[0].id);
  const active = docs.find((d) => d.id === activeId) ?? docs[0];
  const rendered = useMemo(() => renderMarkdown(active.content), [active]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
      {/* Top bar */}
      <header className="bg-white border-b border-gray-300 px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors font-sans"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="w-px h-5 bg-gray-300" />
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-sans">Ultimate Warrior Challenges</p>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">Legal &amp; Policy Documents</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-sans text-gray-400 uppercase tracking-widest">
            {docs.findIndex((d) => d.id === activeId) + 1} / {docs.length}
          </span>
          <span className="text-xs font-sans bg-gray-100 border border-gray-300 text-gray-600 px-2.5 py-1 rounded">
            {active.category}
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — document index */}
        <nav className="w-64 shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-sans font-semibold text-gray-400 uppercase tracking-widest mb-3">Contents</p>
          </div>
          <ul className="pb-6">
            {docs.map((doc, index) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(doc.id)}
                  className={`w-full text-left px-5 py-3 border-l-2 transition-colors font-sans ${
                    activeId === doc.id
                      ? "border-gray-800 bg-gray-50 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <p className="text-xs text-gray-400 mb-0.5">{String(index + 1).padStart(2, "0")}</p>
                  <p className="text-sm font-medium leading-snug">{doc.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{doc.category}</p>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Document viewer */}
        <main className="flex-1 overflow-y-auto bg-gray-100 px-10 py-10">
          <div className="max-w-3xl mx-auto">
            {/* Page */}
            <div className="bg-white shadow-md border border-gray-200 px-14 py-14 min-h-[calc(100vh-160px)]">
              {/* Document header */}
              <div className="border-b border-gray-200 pb-8 mb-10">
                <p className="text-xs font-sans text-gray-400 uppercase tracking-widest mb-2">{active.category}</p>
                <h2 className="text-3xl font-bold text-gray-900 leading-tight">{active.title}</h2>
                <p className="text-sm font-sans text-gray-400 mt-3">
                  Ultimate Warrior Challenges &nbsp;·&nbsp; Effective Date: May 2026
                </p>
              </div>

              {/* Document body */}
              <div className="text-gray-800 leading-relaxed">
                {rendered.map((block, i) => {
                  if (block.type === "hr") {
                    return <hr key={i} className="my-8 border-gray-200" />;
                  }
                  if (block.type === "h1") {
                    return (
                      <h2 key={i} className="text-2xl font-bold text-gray-900 mt-10 mb-4 leading-tight">
                        {block.text}
                      </h2>
                    );
                  }
                  if (block.type === "h2") {
                    return (
                      <h3 key={i} className="text-lg font-bold text-gray-900 mt-8 mb-3 leading-snug">
                        {block.text}
                      </h3>
                    );
                  }
                  if (block.type === "h3") {
                    return (
                      <h4 key={i} className="text-base font-semibold text-gray-700 mt-6 mb-2 leading-snug font-sans uppercase tracking-wide">
                        {block.text}
                      </h4>
                    );
                  }
                  return (
                    <p key={i} className="mb-4 text-[15px] text-gray-700 leading-relaxed">
                      {block.text}
                    </p>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 mt-14 pt-6 flex items-center justify-between">
                <p className="text-xs font-sans text-gray-400">
                  Ultimate Warrior Challenges &nbsp;·&nbsp; Confidential
                </p>
                <p className="text-xs font-sans text-gray-400">
                  Document {docs.findIndex((d) => d.id === activeId) + 1} of {docs.length}
                </p>
              </div>
            </div>

            {/* Prev / Next navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                type="button"
                disabled={docs.findIndex((d) => d.id === activeId) === 0}
                onClick={() => {
                  const idx = docs.findIndex((d) => d.id === activeId);
                  if (idx > 0) setActiveId(docs[idx - 1].id);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-sm font-sans text-gray-600 hover:border-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <button
                type="button"
                disabled={docs.findIndex((d) => d.id === activeId) === docs.length - 1}
                onClick={() => {
                  const idx = docs.findIndex((d) => d.id === activeId);
                  if (idx < docs.length - 1) setActiveId(docs[idx + 1].id);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-sm font-sans text-gray-600 hover:border-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Next
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
