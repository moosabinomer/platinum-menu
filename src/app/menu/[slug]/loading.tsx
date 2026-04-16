export default function CustomerMenuLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-10 flex flex-col items-center">
          <div className="h-20 w-20 animate-pulse rounded-full bg-stone-700" />
          <div className="mt-4 h-8 w-64 animate-pulse rounded bg-stone-700" />
        </div>
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-40 animate-pulse rounded-2xl bg-stone-800/70" />
          ))}
        </div>
      </div>
    </div>
  );
}
