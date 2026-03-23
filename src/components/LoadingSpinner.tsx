/** Reusable Roman-themed loading indicators */

/** Full-page loading screen with animated sword emblem */
export function LoadingScreen({ message = "Summoning the legion..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 gap-6">
      <div className="roman-loader">
        <div className="roman-loader-ring" />
        <span className="roman-loader-icon">⚔</span>
      </div>
      <p className="text-roman-gold/80 text-sm uppercase tracking-[0.2em] font-semibold">
        {message}
      </p>
    </div>
  );
}

/** Full-page variant used for route-level loading (centered on screen) */
export function FullPageLoader({ message = "Loading the Legion..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center gap-6">
      <div className="roman-loader roman-loader-lg">
        <div className="roman-loader-ring" />
        <span className="roman-loader-icon">⚔</span>
      </div>
      <p className="text-roman-gold/80 text-sm uppercase tracking-[0.2em] font-semibold">
        {message}
      </p>
    </div>
  );
}

/** Inline spinner for buttons */
export function ButtonSpinner() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg className="roman-btn-spinner w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="50 20" />
      </svg>
    </span>
  );
}

/** Skeleton table rows for the Campaigns page */
export function CampaignsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-stone-700/50 overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-stone-800/80 border-b border-stone-700/50">
            <th className="px-8 py-5 text-base uppercase tracking-wider text-stone-400 font-semibold">Name</th>
            <th className="px-8 py-5 text-base uppercase tracking-wider text-stone-400 font-semibold w-24">Age</th>
            <th className="px-8 py-5 text-base uppercase tracking-wider text-stone-400 font-semibold w-40">Class</th>
            <th className="px-8 py-5 text-base uppercase tracking-wider text-stone-400 font-semibold w-32">Miles</th>
            <th className="px-8 py-5 text-base uppercase tracking-wider text-stone-400 font-semibold w-44">Campaign</th>
            <th className="px-8 py-5 text-base uppercase tracking-wider text-stone-400 font-semibold w-96">Progress</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className="border-b border-stone-800/50">
              <td className="pl-8 py-6">
                <div className="flex items-center gap-3">
                  <div className="skeleton-shimmer w-9 h-9 rounded-full shrink-0" />
                  <div className="skeleton-shimmer h-5 w-32 rounded" />
                </div>
              </td>
              <td className="px-8 py-6"><div className="skeleton-shimmer h-5 w-8 rounded" /></td>
              <td className="px-8 py-6"><div className="skeleton-shimmer h-5 w-20 rounded" /></td>
              <td className="px-8 py-6"><div className="skeleton-shimmer h-5 w-12 rounded" /></td>
              <td className="px-8 py-6"><div className="skeleton-shimmer h-5 w-28 rounded" /></td>
              <td className="px-8 py-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-4">
                    <div className="skeleton-shimmer flex-1 h-4 rounded-full" />
                    <div className="skeleton-shimmer h-5 w-10 rounded" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="skeleton-shimmer flex-1 h-2 rounded-full" />
                    <div className="skeleton-shimmer h-3 w-10 rounded" />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Skeleton cards for the StudentCampaign page */
export function StudentCampaignSkeleton() {
  return (
    <>
      {/* Header skeleton */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <div className="skeleton-shimmer h-3 w-28 rounded mb-3" />
          <div className="skeleton-shimmer h-9 w-56 rounded mb-2" />
          <div className="skeleton-shimmer h-4 w-16 rounded" />
        </div>
        <div className="text-right">
          <div className="skeleton-shimmer h-3 w-20 rounded mb-3 ml-auto" />
          <div className="skeleton-shimmer h-9 w-24 rounded ml-auto mb-2" />
          <div className="skeleton-shimmer h-4 w-16 rounded ml-auto" />
        </div>
      </div>

      {/* Progress bar skeleton */}
      <div className="mb-10">
        <div className="flex justify-between mb-2">
          <div className="skeleton-shimmer h-3 w-24 rounded" />
          <div className="skeleton-shimmer h-3 w-8 rounded" />
        </div>
        <div className="skeleton-shimmer h-3 rounded-full" />
      </div>

      {/* Campaign card skeletons */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-stone-700/30 bg-stone-800/20 px-8 py-5"
          >
            <div className="flex items-center gap-6">
              <div className="skeleton-shimmer w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="skeleton-shimmer h-5 w-36 rounded mb-1.5" />
                    <div className="skeleton-shimmer h-3 w-24 rounded" />
                  </div>
                  <div className="skeleton-shimmer h-4 w-16 rounded" />
                </div>
                <div className="skeleton-shimmer h-2 rounded-full" />
              </div>
              <div className="skeleton-shimmer h-4 w-16 rounded shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
