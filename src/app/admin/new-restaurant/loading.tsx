export default function NewRestaurantLoading() {
  return (
    <div className="space-y-8">
      <div className="h-12 w-80 animate-pulse rounded-lg bg-stone-200" />
      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-10 animate-pulse rounded-lg bg-stone-100" />
          ))}
          <div className="h-48 animate-pulse rounded-lg bg-stone-100" />
        </div>
      </div>
    </div>
  );
}
