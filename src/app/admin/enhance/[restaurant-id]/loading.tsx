export default function EnhanceLoading() {
  return (
    <div className="space-y-6">
      <div className="h-12 w-96 animate-pulse rounded-lg bg-stone-200" />
      <div className="h-24 animate-pulse rounded-xl border border-stone-200 bg-white" />
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="h-36 animate-pulse rounded-xl border border-stone-200 bg-white" />
      ))}
    </div>
  );
}
