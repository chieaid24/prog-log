export default function Loading() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]" aria-hidden="true">
      <div className="flex flex-col gap-4">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-panel" />
        <div className="h-44 animate-pulse rounded-2xl bg-panel" />
        <div className="h-72 animate-pulse rounded-2xl bg-panel" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-80 animate-pulse rounded-2xl bg-panel" />
        <div className="h-44 animate-pulse rounded-2xl bg-panel" />
      </div>
    </div>
  );
}
