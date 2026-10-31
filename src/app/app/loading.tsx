/**
 * App loading skeleton (task D2).
 * Matches the layout rhythm of the app shell with quiet skeleton pulses.
 */
export default function AppLoading() {
  return (
    <main
      className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 md:p-8"
      role="status"
      aria-label="Loading page content"
    >
      <div className="mx-auto w-full max-w-[800px] animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between border-b border-line pb-6">
          <div className="flex flex-col gap-2">
            <div className="h-8 w-48 rounded-control bg-hover-2" />
            <div className="h-4 w-72 rounded-control bg-hover" />
          </div>
          <div className="h-10 w-28 rounded-full bg-hover" />
        </div>

        {/* Content skeleton rows */}
        <div className="mt-8 flex flex-col gap-4">
          <div className="h-24 rounded-card border border-line bg-surface/60" />
          <div className="h-40 rounded-card border border-line bg-surface/60" />
          <div className="h-32 rounded-card border border-line bg-surface/60" />
        </div>
      </div>
    </main>
  );
}
