import Link from 'next/link';
import { UtensilsCrossed, Sparkles, QrCode, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-stone-100">
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-sm text-amber-200">
          <UtensilsCrossed className="h-4 w-4" />
          Platinum Menu
        </div>

        <section className="space-y-5">
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Premium AI Menus with
            <span className="text-amber-400"> Instant QR Publishing</span>
          </h1>
          <p className="max-w-2xl text-lg text-stone-300">
            Turn a menu photo into a polished digital dining experience with AI extraction, enhancement, and one-click publish.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white transition hover:bg-amber-500"
            >
              Open Admin
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-stone-700/70 bg-stone-900/60 p-5">
            <Sparkles className="mb-3 h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold">AI Enhancement</h2>
            <p className="mt-2 text-sm text-stone-400">Generate premium descriptions, macros, and add-ons from item photos.</p>
          </div>
          <div className="rounded-xl border border-stone-700/70 bg-stone-900/60 p-5">
            <QrCode className="mb-3 h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold">QR Publishing</h2>
            <p className="mt-2 text-sm text-stone-400">Publish menus and distribute scannable QR codes in seconds.</p>
          </div>
          <div className="rounded-xl border border-stone-700/70 bg-stone-900/60 p-5">
            <ShieldCheck className="mb-3 h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold">Admin Controlled</h2>
            <p className="mt-2 text-sm text-stone-400">Approve items, review content, and control what customers see.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
