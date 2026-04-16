export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-stone-200" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="h-32 animate-pulse rounded-xl border border-stone-200 bg-white" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl border border-stone-200 bg-white" />
        <div className="h-64 animate-pulse rounded-xl border border-stone-200 bg-white" />
      </div>
    </div>
  );
}
