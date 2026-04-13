import type { JSX } from 'preact';
import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { navigate, useSearchParams, Link } from '@/lib/router';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { connectSSE } from '@/lib/sse';
import type { KnowledgeBase, Document } from '@llmwiki/shared';

interface Props {
  slug: string;
}

interface TreeNode {
  name: string;
  path: string;
  doc?: Document;
  children: TreeNode[];
  expanded: boolean;
}

export function WikiDetailPage({ slug }: Props): JSX.Element {
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [fileDragOver, setFileDragOver] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [ingestingDocs, setIngestingDocs] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Document[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const params = useSearchParams();

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // SSE for real-time ingest updates
  useEffect(() => {
    if (!kb) return;
    const disconnect = connectSSE((event) => {
      if (event.kbId !== kb.id) return;

      if (event.type === 'ingest_started') {
        setIngestingDocs((prev) => new Set([...prev, event.docId as string]));
      }

      if (event.type === 'ingest_completed' || event.type === 'ingest_failed') {
        setIngestingDocs((prev) => {
          const next = new Set(prev);
          next.delete(event.docId as string);
          return next;
        });
        // Refresh docs to pick up new wiki pages
        api.get<Document[]>(`/v1/knowledge-bases/${kb.id}/documents`).then(setDocs);
      }
    });
    return disconnect;
  }, [kb?.id]);

  // Load KB by slug
  useEffect(() => {
    (async () => {
      try {
        const kbs = await api.get<KnowledgeBase[]>('/v1/knowledge-bases');
        const found = kbs.find((k) => k.slug === slug);
        if (!found) {
          navigate('/wikis');
          return;
        }
        setKb(found);
        const allDocs = await api.get<Document[]>(`/v1/knowledge-bases/${found.id}/documents`);
        setDocs(allDocs);

        // Default to overview
        const docParam = params.get('doc');
        const pageParam = params.get('page');
        if (docParam) {
          const doc = allDocs.find((d) => d.id === docParam);
          if (doc) { setActiveDoc(doc); loadContent(doc.id); }
        } else if (pageParam) {
          setActivePath(pageParam);
          const doc = allDocs.find((d) => (d.path + d.filename) === pageParam);
          if (doc) loadContent(doc.id);
        } else {
          const overview = allDocs.find((d) => d.path === '/wiki/' && d.filename === 'overview.md');
          if (overview) {
            setActivePath('/wiki/overview.md');
            loadContent(overview.id);
          }
        }
      } catch {
        navigate('/wikis');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  async function loadContent(docId: string): Promise<void> {
    const result = await api.get<{ id: string; content: string | null }>(`/v1/documents/${docId}/content`);
    setContent(result.content);
  }

  function selectWikiPage(doc: Document): void {
    const fullPath = doc.path + doc.filename;
    setActivePath(fullPath);
    setActiveDoc(null);
    loadContent(doc.id);
    window.history.replaceState({}, '', `?page=${encodeURIComponent(fullPath)}`);
  }

  function selectSourceDoc(doc: Document): void {
    setActiveDoc(doc);
    setActivePath(null);
    loadContent(doc.id);
    window.history.replaceState({}, '', `?doc=${doc.id}`);
  }

  async function uploadFiles(files: FileList | File[]): Promise<void> {
    if (!kb || !files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const doc = await api.upload<Document>(`/v1/knowledge-bases/${kb.id}/documents/upload`, file, { path: '/' });
        setDocs((prev) => [...prev, doc]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }

  function handleFileInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files) uploadFiles(input.files);
    input.value = '';
  }

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    setFileDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide overlay when leaving the container (not child elements)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { clientX: x, clientY: y } = e;
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setFileDragOver(false);
    }
  }, []);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFileDragOver(false);
    if (e.dataTransfer?.files) uploadFiles(e.dataTransfer.files);
  }, [kb]);

  const wikiDocs = docs.filter((d) => d.path.startsWith('/wiki/'));
  const sourceDocs = docs.filter((d) => !d.path.startsWith('/wiki/'));

  if (loading) {
    return (
      <div class="flex items-center justify-center h-screen">
        <p class="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div
      class="flex flex-col h-screen relative"
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drag overlay */}
      {fileDragOver && (
        <div class="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div class="flex flex-col items-center gap-3 border-2 border-dashed border-primary rounded-xl px-12 py-10">
            <svg class="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <p class="text-sm font-medium text-primary">Drop files to upload</p>
            <p class="text-xs text-muted-foreground">PDF, Word, PowerPoint, images, and more</p>
          </div>
        </div>
      )}

      <div class="flex-1 overflow-hidden flex">
        {/* Sidebar */}
        <div class="w-56 shrink-0 h-full flex flex-col border-r border-border">
          {/* Wiki selector */}
          <div class="shrink-0 px-3 pt-3 pb-2">
            <Link href="/wikis" class="flex items-center gap-2 text-sm font-medium hover:text-muted-foreground transition-colors">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              {kb?.name}
            </Link>
          </div>

          {/* Search + Upload */}
          <div class="shrink-0 px-2 pb-1 flex items-center gap-1.5">
            <button
              onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50); }}
              class="flex items-center gap-2 flex-1 px-2.5 py-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground border border-border hover:bg-accent rounded-md transition-colors cursor-pointer"
            >
              <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <span class="flex-1 text-left">Search</span>
              <kbd class="text-[10px] text-muted-foreground/30 bg-muted px-1 rounded">⌘K</kbd>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              class="flex items-center justify-center px-2.5 py-1.5 text-muted-foreground/50 hover:text-muted-foreground border border-border hover:bg-accent rounded-md transition-colors cursor-pointer disabled:opacity-50"
              title="Upload source"
            >
              {uploading ? (
                <svg class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4m0 12v4m-7-7H3m18 0h-4m-1.5-7.5L17 7m-10 10l1.5-1.5M7 7L5.5 5.5m13 13L17 17" />
                </svg>
              ) : (
                <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
              )}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.pptx,.doc,.ppt,.png,.jpg,.jpeg,.webp,.gif,.html,.htm,.xlsx,.xls,.csv,.md,.txt"
            class="hidden"
            onChange={handleFileInput}
          />

          {/* Wiki section */}
          <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div class="flex flex-col min-h-0 px-2 pt-1" style={{ maxHeight: '50%' }}>
              <div class="flex items-center px-2 mb-1 shrink-0">
                <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">Wiki</span>
              </div>
              <div class="overflow-y-auto no-scrollbar">
                {wikiDocs.map((doc) => {
                  const fullPath = doc.path + doc.filename;
                  const isActive = activePath === fullPath;
                  return (
                    <button
                      key={doc.id}
                      onClick={() => selectWikiPage(doc)}
                      class={cn(
                        'flex items-center gap-2 w-full px-2 py-1 text-xs rounded-md transition-colors text-left',
                        isActive ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                      )}
                    >
                      <svg class="h-3 w-3 shrink-0 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
                      </svg>
                      <span class="truncate">{doc.title ?? doc.filename}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sources section */}
            <div class="flex-1 min-h-0 flex flex-col px-2 mt-2">
              <button
                onClick={() => setSourcesExpanded((v) => !v)}
                class="flex items-center gap-1 px-2 py-1 shrink-0 cursor-pointer"
              >
                <svg
                  class={cn('h-3 w-3 text-muted-foreground/40 transition-transform', sourcesExpanded && 'rotate-90')}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
                <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                  Sources
                </span>
                {sourceDocs.length > 0 && (
                  <span class="text-[10px] text-muted-foreground/30 ml-1">{sourceDocs.length}</span>
                )}
              </button>
              {sourcesExpanded && (
                <div class="flex-1 overflow-y-auto no-scrollbar mt-0.5">
                  {sourceDocs.length === 0 && (
                    <p class="px-2 py-4 text-[11px] text-muted-foreground/40 text-center">
                      Drop files here to add sources
                    </p>
                  )}
                  {sourceDocs.map((doc) => {
                    const isActive = activeDoc?.id === doc.id;
                    const isIngesting = ingestingDocs.has(doc.id) || doc.status === 'processing';
                    return (
                      <button
                        key={doc.id}
                        onClick={() => selectSourceDoc(doc)}
                        class={cn(
                          'flex items-center gap-2 w-full px-2 py-1 text-xs rounded-md transition-colors text-left',
                          isActive ? 'bg-accent text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                        )}
                      >
                        {isIngesting ? (
                          <svg class="h-3 w-3 shrink-0 animate-spin text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path d="M12 2v4m0 12v4m-7-7H3m18 0h-4m-1.5-7.5L17 7m-10 10l1.5-1.5M7 7L5.5 5.5m13 13L17 17" />
                          </svg>
                        ) : (
                          <FileIcon type={doc.fileType} />
                        )}
                        <span class="truncate">{doc.title ?? doc.filename}</span>
                        {isIngesting && (
                          <span class="text-[9px] text-accent-blue ml-auto shrink-0">ingesting</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom */}
          <div class="shrink-0 border-t border-border p-2">
            <Link href="/settings" class="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent">
              <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Settings
            </Link>
          </div>
        </div>

        {/* Main content */}
        <div class="flex-1 min-w-0 overflow-y-auto">
          {content !== null ? (
            <div class="max-w-3xl mx-auto px-8 py-8">
              <div class="wiki-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
            </div>
          ) : (
            <div class="flex flex-col items-center justify-center h-full text-center p-8">
              <p class="text-sm text-muted-foreground mb-4">
                Drop files here or select a page from the sidebar
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Search overlay */}
      {searchOpen && (
        <div class="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
          <div class="relative z-50 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
            <div class="flex items-center gap-3 px-4 border-b border-border">
              <svg class="h-4 w-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search wiki and sources..."
                class="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/50"
                value={searchQuery}
                onInput={(e) => {
                  const q = (e.target as HTMLInputElement).value;
                  setSearchQuery(q);
                  if (q.trim() && kb) {
                    // Filter docs client-side for instant results
                    const lower = q.toLowerCase();
                    setSearchResults(
                      docs.filter(
                        (d) =>
                          d.filename.toLowerCase().includes(lower) ||
                          (d.title ?? '').toLowerCase().includes(lower) ||
                          (d.content ?? '').toLowerCase().includes(lower),
                      ).slice(0, 10),
                    );
                  } else {
                    setSearchResults([]);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchOpen(false);
                }}
              />
              <kbd class="text-[10px] text-muted-foreground/30 bg-muted px-1.5 py-0.5 rounded">esc</kbd>
            </div>
            {searchResults.length > 0 && (
              <div class="max-h-80 overflow-y-auto py-2">
                {searchResults.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      if (doc.path.startsWith('/wiki/')) {
                        selectWikiPage(doc);
                      } else {
                        selectSourceDoc(doc);
                      }
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    class="flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors text-left"
                  >
                    <FileIcon type={doc.fileType} />
                    <div class="min-w-0 flex-1">
                      <p class="truncate font-medium">{doc.title ?? doc.filename}</p>
                      <p class="text-xs text-muted-foreground truncate">{doc.path}{doc.filename}</p>
                    </div>
                    <span class="text-[10px] text-muted-foreground/40 shrink-0">
                      {doc.path.startsWith('/wiki/') ? 'wiki' : 'source'}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {searchQuery && searchResults.length === 0 && (
              <div class="px-4 py-8 text-center text-sm text-muted-foreground">
                No results for "{searchQuery}"
              </div>
            )}
            {!searchQuery && (
              <div class="px-4 py-8 text-center text-sm text-muted-foreground/50">
                Type to search across wiki pages and sources
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FileIcon({ type }: { type: string }): JSX.Element {
  const colors: Record<string, string> = {
    pdf: 'text-red-400/70',
    png: 'text-violet-400/70',
    jpg: 'text-violet-400/70',
    webp: 'text-violet-400/70',
    html: 'text-sky-400/70',
    xlsx: 'text-green-400/70',
    csv: 'text-green-400/70',
    pptx: 'text-orange-400/70',
    md: 'text-muted-foreground/50',
  };
  return (
    <svg class={cn('h-3 w-3 shrink-0', colors[type] ?? 'text-muted-foreground/50')} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
    </svg>
  );
}

function renderMarkdown(md: string): string {
  // Basic markdown to HTML (will be replaced with proper markdown parser later)
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/^---$/gm, '<hr />')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (line) => {
      if (line.startsWith('<')) return line;
      return line;
    });
}
