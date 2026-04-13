import type { JSX } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Link, navigate } from '@/lib/router';
import { api } from '@/lib/api';
import { relativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { KnowledgeBase } from '@llmwiki/shared';

export function WikisPage(): JSX.Element {
  const [wikis, setWikis] = useState<KnowledgeBase[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get<KnowledgeBase[]>('/v1/knowledge-bases').then(setWikis).catch((e: Error) => setError(e.message));
  }, []);

  async function handleCreate(): Promise<void> {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const kb = await api.post<KnowledgeBase>('/v1/knowledge-bases', { name: newName.trim() });
      navigate(`/wikis/${kb.slug}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  const hasWikis = wikis && wikis.length > 0;

  return (
    <div class="h-full flex flex-col">
      {/* Header */}
      <div class="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
        <Link href="/" class="flex items-center gap-2 text-lg font-bold">
          <svg class="h-5 w-5" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="currentColor" />
            <path d="M8 8h4v16H8V8zm6 0h4v16h-4V8zm6 0h4v16h-4V8z" fill="var(--color-background)" opacity="0.9" />
          </svg>
          LLM Wiki
        </Link>
        <div class="flex items-center gap-3">
          {hasWikis && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              New Wiki
            </Button>
          )}
          <Link href="/settings" class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Content */}
      {error && <p class="px-6 py-4 text-sm text-destructive">{error}</p>}

      {wikis === null && !error && (
        <div class="flex-1 flex items-center justify-center">
          <p class="text-sm text-muted-foreground">Loading...</p>
        </div>
      )}

      {!hasWikis && wikis !== null && (
        <div class="flex-1 flex flex-col items-center justify-center p-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-foreground mb-6">
            <svg class="h-6 w-6 text-background" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5a2.5 2.5 0 010-5H20" />
            </svg>
          </div>
          <h1 class="text-3xl font-bold tracking-tight mb-4">Create your first wiki</h1>
          <p class="text-sm text-muted-foreground mb-10 max-w-md text-center">
            A wiki is a persistent knowledge base that compounds with every source you add.
          </p>

          <div class="grid sm:grid-cols-3 gap-4 mb-10 max-w-2xl">
            {[
              { num: '1', title: 'Create a wiki', desc: 'Name your knowledge base' },
              { num: '2', title: 'Add sources', desc: 'Upload PDFs, articles, notes' },
              { num: '3', title: 'Let the LLM compile', desc: 'Cross-references, summaries, entities' },
            ].map((s) => (
              <div key={s.num} class="rounded-xl border border-border p-4 text-center">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-xs font-bold mb-2">
                  {s.num}
                </span>
                <h3 class="text-sm font-medium mb-1">{s.title}</h3>
                <p class="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>

          <Button class="rounded-full px-8 py-3" onClick={() => setShowCreate(true)}>
            Get started
          </Button>
        </div>
      )}

      {hasWikis && (
        <div class="flex-1 overflow-y-auto">
          <div class="max-w-4xl mx-auto px-8 py-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wikis!.map((kb) => (
                <button
                  key={kb.id}
                  onClick={() => navigate(`/wikis/${kb.slug}`)}
                  class="flex flex-col items-start gap-3 p-5 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer text-left group"
                >
                  <div class="flex items-center gap-3 min-w-0 w-full">
                    <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-muted group-hover:bg-accent shrink-0">
                      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path d="M4 19.5v-15A2.5 2.5 0 016.5 2H20v20H6.5a2.5 2.5 0 010-5H20" />
                      </svg>
                    </div>
                    <div class="min-w-0 flex-1">
                      <h2 class="text-sm font-medium text-foreground truncate">{kb.name}</h2>
                      {kb.description && (
                        <p class="text-xs text-muted-foreground mt-0.5 truncate">{kb.description}</p>
                      )}
                    </div>
                  </div>
                  <div class="flex items-center gap-2 text-[11px] text-muted-foreground/50 w-full">
                    <span>
                      {[
                        kb.sourceCount ? `${kb.sourceCount} sources` : null,
                        kb.wikiPageCount ? `${kb.wikiPageCount} pages` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Empty'}
                    </span>
                    <span class="ml-auto shrink-0">{relativeTime(kb.updatedAt)}</span>
                  </div>
                </button>
              ))}

              {/* New wiki card */}
              <button
                onClick={() => setShowCreate(true)}
                class="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <svg class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14m-7-7h14" />
                </svg>
                <span class="text-xs text-muted-foreground">New Wiki</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogHeader>
          <DialogTitle>Create wiki</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="My Research"
          value={newName}
          onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          autofocus
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
