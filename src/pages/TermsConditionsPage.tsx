import { useNavigate } from "react-router-dom";

const TERMS_PDF_PATH = "/Terms%20%26%20Conditions.docx.pdf";

export default function TermsConditionsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
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
            <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">Terms &amp; Conditions</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={TERMS_PDF_PATH}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-sans bg-gray-100 border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 transition-colors"
          >
            Open PDF
          </a>
        </div>
      </header>

      <main className="flex-1 bg-gray-100 p-4 md:p-6 lg:p-8">
        <div className="w-full h-full min-h-[calc(100vh-120px)] bg-white border border-gray-300 shadow-sm rounded overflow-hidden">
          <iframe
            title="Terms and Conditions"
            src={TERMS_PDF_PATH}
            className="w-full h-[calc(100vh-120px)]"
          />
        </div>
      </main>
    </div>
  );
}
