import type { JSX } from 'preact';
import { Link } from '@/lib/router';

export function LandingPage(): JSX.Element {
  return (
    <div class="min-h-svh bg-background text-foreground">
      {/* Navigation */}
      <header class="fixed top-0 inset-x-0 z-50 backdrop-blur-sm bg-background/80 border-b border-border/50">
        <div class="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
          <Link href="/" class="flex items-center gap-2 text-lg font-bold">
            <svg class="h-6 w-6" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="currentColor" />
              <path d="M8 8h4v16H8V8zm6 0h4v16h-4V8zm6 0h4v16h-4V8z" fill="var(--color-background)" opacity="0.9" />
            </svg>
            LLM Wiki
          </Link>
          <div class="flex items-center gap-3">
            <Link href="/login" class="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link href="/login" class="rounded-full bg-foreground text-background px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main class="max-w-5xl mx-auto px-6">
        <section class="pt-32 pb-20 text-center">
          <h1 class="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            LLM Wiki
          </h1>
          <p class="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Build a persistent, compounding knowledge base where the LLM does all the bookkeeping.
            Based on{' '}
            <a
              href="https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f"
              class="underline underline-offset-2 hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener"
            >
              Andrej Karpathy's LLM Wiki pattern
            </a>.
          </p>
          <div class="flex items-center justify-center gap-4">
            <Link href="/login" class="rounded-full bg-foreground text-background px-8 py-3 text-sm font-medium hover:opacity-90 transition-opacity">
              Get started
            </Link>
          </div>
        </section>

        {/* Three layers */}
        <section class="py-24">
          <div class="grid sm:grid-cols-3 gap-6">
            {[
              { title: 'Raw Sources', desc: 'Your curated collection of articles, papers, notes. Immutable — the LLM reads but never modifies.' },
              { title: 'The Wiki', desc: 'LLM-generated markdown pages. Summaries, entity pages, cross-references — all kept consistent.' },
              { title: 'The Schema', desc: 'Configuration that tells the LLM how to structure the wiki and what workflows to follow.' },
            ].map((layer) => (
              <div key={layer.title} class="rounded-xl border border-border bg-card p-6">
                <h3 class="text-sm font-semibold mb-2">{layer.title}</h3>
                <p class="text-sm text-muted-foreground leading-relaxed">{layer.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section class="py-24">
          <div class="grid sm:grid-cols-3 gap-10">
            {[
              { num: '01', title: 'Ingest', desc: 'Drop a source. The LLM reads it, extracts key info, updates 10-15 wiki pages. Knowledge compounds.' },
              { num: '02', title: 'Query', desc: 'Ask questions against compiled knowledge. Good answers become new wiki pages. Exploration compounds.' },
              { num: '03', title: 'Lint', desc: 'Health-check for contradictions, stale claims, orphan pages, missing concepts. The wiki heals itself.' },
            ].map((step) => (
              <div key={step.num}>
                <span class="text-xs font-mono text-muted-foreground/50">{step.num}</span>
                <h3 class="text-base font-semibold mt-1 mb-2">{step.title}</h3>
                <p class="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quote */}
        <section class="py-24 text-center">
          <blockquote class="text-lg italic text-muted-foreground max-w-2xl mx-auto">
            "The human curates sources, directs analysis, asks good questions, and thinks about meaning. The LLM handles everything else."
          </blockquote>
          <p class="text-sm text-muted-foreground/50 mt-4">— Andrej Karpathy</p>
        </section>

        {/* CTA */}
        <section class="py-24 text-center">
          <h2 class="text-2xl font-bold tracking-tight mb-6">Start building your wiki</h2>
          <Link href="/login" class="inline-block rounded-full bg-foreground text-background px-8 py-3 text-sm font-medium hover:opacity-90 transition-opacity">
            Get started free
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer class="border-t border-border px-6 py-6">
        <div class="max-w-5xl mx-auto flex items-center justify-between">
          <span class="text-xs text-muted-foreground/50 flex items-center gap-2">
            <svg class="h-4 w-4" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="currentColor" />
            </svg>
            LLM Wiki
          </span>
          <span class="text-xs text-muted-foreground/50">
            Open source under AGPL-3.0
          </span>
        </div>
      </footer>
    </div>
  );
}
