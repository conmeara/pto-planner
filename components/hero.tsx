import NextLogo from "./next-logo";
import SupabaseLogo from "./supabase-logo";

export default function Header() {
  return (
    <div className="flex flex-col items-center gap-12 text-center">
      <div className="flex items-center justify-center gap-8 rounded-full border border-[hsl(var(--border) / 0.6)] bg-[hsl(var(--card) / 0.72)] px-6 py-2 shadow-[0_18px_45px_-30px_rgba(38,73,70,0.5)] backdrop-blur-sm">
        <a
          href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
          target="_blank"
          rel="noreferrer"
          className="transition-transform hover:scale-105"
        >
          <SupabaseLogo />
        </a>
        <span className="h-6 w-px bg-[hsl(var(--border) / 0.7)]" />
        <a
          href="https://nextjs.org/"
          target="_blank"
          rel="noreferrer"
          className="transition-transform hover:scale-105"
        >
          <NextLogo />
        </a>
      </div>
      <div className="flex flex-col items-center gap-4">
        <span className="rounded-full bg-[hsl(var(--primary) / 0.18)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-[hsl(var(--primary) / 0.7)]">
          PTO Planner
        </span>
        <p className="mx-auto max-w-2xl text-3xl font-semibold leading-tight text-[hsl(var(--ghibli-forest))] lg:text-4xl">
          Plan restful escapes with Studio Ghibli calm and a touch of automation
        </p>
        <p className="mx-auto max-w-xl text-sm text-[hsl(var(--ghibli-forest) / 0.65)]">
          Sync your PTO balance, explore dreamy calendar strategies, and share plans that feel as
          charming as a stroll through Koriko.
        </p>
      </div>
      <div className="h-px w-full max-w-xl bg-gradient-to-r from-transparent via-[hsl(var(--primary) / 0.2)] to-transparent" />
    </div>
  );
}
