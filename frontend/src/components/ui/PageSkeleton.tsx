/**
 * PageSkeleton — Loading placeholder shown while lazy pages load.
 * Matches the AppShell layout: sidebar placeholder + main content area.
 */
export default function PageSkeleton() {
  return (
    <div data-testid="page-skeleton" className="flex h-full w-full animate-pulse p-6">
      {/* Main content area */}
      <div className="flex-1">
        {/* Title bar skeleton */}
        <div className="h-7 w-56 rounded bg-gray-20 dark:bg-[#2a2a2a] mb-2" />
        <div className="h-4 w-80 rounded bg-gray-10 dark:bg-[#1e1e1e] mb-6" />

        {/* Stat cards row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-gray-10 dark:bg-[#1e1e1e] border border-card-border"
            />
          ))}
        </div>

        {/* Content blocks */}
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 rounded-xl bg-gray-10 dark:bg-[#1e1e1e] border border-card-border" />
          <div className="space-y-4">
            <div className="h-28 rounded-xl bg-gray-10 dark:bg-[#1e1e1e] border border-card-border" />
            <div className="h-28 rounded-xl bg-gray-10 dark:bg-[#1e1e1e] border border-card-border" />
          </div>
        </div>
      </div>
    </div>
  );
}
