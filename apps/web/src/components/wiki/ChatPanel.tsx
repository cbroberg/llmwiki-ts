import type { JSX } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Props {
  kbId?: string;
  kbName?: string;
  onClose?: () => void;
  embedded?: boolean;
}

export function ChatPanel({ kbId, kbName, onClose, embedded }: Props): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(): Promise<void> {
    const msg = input.trim();
    if (!msg || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: msg, timestamp: Date.now() }]);
    setLoading(true);

    try {
      const endpoint = kbId ? `/v1/knowledge-bases/${kbId}/chat` : '/v1/chat';
      const res = await api.post<{ answer: string }>(endpoint, { message: msg });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.answer, timestamp: Date.now() }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${(err as Error).message}`, timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div class={cn('flex flex-col h-full bg-card', embedded ? 'rounded-xl border border-border' : 'border-l border-border')}>
      {/* Header */}
      <div class="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <div class="flex items-center gap-2">
          <svg class="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span class="text-sm font-medium">
            {kbName ? `Chat with ${kbName}` : 'Ask your wikis'}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div class="text-center py-12">
            <p class="text-sm text-muted-foreground mb-3">
              Ask questions about your wiki
            </p>
            <div class="space-y-2">
              {[
                'What are the key concepts?',
                'Summarize the main findings',
                'What contradictions exist?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  class="block w-full text-left px-3 py-2 text-xs text-muted-foreground border border-border rounded-lg hover:bg-accent hover:text-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            class={cn(
              'flex',
              msg.role === 'user' ? 'justify-end' : 'justify-start',
            )}
          >
            <div
              class={cn(
                'max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground',
              )}
            >
              {msg.role === 'assistant' ? (
                <div class="wiki-content" dangerouslySetInnerHTML={{ __html: simpleMarkdown(msg.content) }} />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div class="flex justify-start">
            <div class="bg-muted rounded-xl px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M12 2v4m0 12v4m-7-7H3m18 0h-4m-1.5-7.5L17 7m-10 10l1.5-1.5M7 7L5.5 5.5m13 13L17 17" />
              </svg>
              Searching wiki and thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div class="shrink-0 border-t border-border p-3">
        <div class="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask a question..."
            class="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
            value={input}
            onInput={(e) => setInput((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            class="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
            </svg>
          </button>
        </div>
        <p class="text-[10px] text-muted-foreground/40 mt-1.5 text-center">
          Powered by Claude via your local Max plan
        </p>
      </div>
    </div>
  );
}

function simpleMarkdown(text: string): string {
  return text
    .replace(/\[\[(.+?)\]\]/g, '<a href="#" class="text-accent-blue underline">$1</a>')
    .replace(/```[\s\S]*?```/g, (m) => `<pre class="rounded bg-background/50 p-2 my-2 text-xs overflow-x-auto"><code>${m.slice(3, -3).trim()}</code></pre>`)
    .replace(/`(.+?)`/g, '<code class="rounded bg-background/50 px-1 text-xs">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-semibold mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="font-bold mt-3 mb-1">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}
