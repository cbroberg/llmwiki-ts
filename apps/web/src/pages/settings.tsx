import type { JSX } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Link } from '@/lib/router';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { Usage } from '@llmwiki/shared';

export function SettingsPage(): JSX.Element {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [user, setUser] = useState<{ email: string; displayName: string | null; avatarUrl: string | null } | null>(null);

  useEffect(() => {
    api.get<Usage>('/v1/usage').then(setUsage).catch(() => {});
    api.get<{ email: string; displayName: string | null; avatarUrl: string | null }>('/v1/me').then(setUser).catch(() => {});
  }, []);

  async function handleLogout(): Promise<void> {
    await api.post('/auth/logout');
    window.location.href = '/';
  }

  const storageUsedMB = usage ? (usage.totalStorageBytes / 1024 / 1024).toFixed(1) : '0';
  const storageMaxMB = usage ? (usage.maxStorageBytes / 1024 / 1024).toFixed(0) : '1024';
  const storagePercent = usage ? Math.min(100, (usage.totalStorageBytes / usage.maxStorageBytes) * 100) : 0;
  const pagePercent = usage ? Math.min(100, (usage.totalPages / usage.maxPages) * 100) : 0;

  return (
    <div class="max-w-2xl mx-auto p-8">
      {/* Back */}
      <div class="flex items-center gap-3 mb-8">
        <Link href="/wikis" class="p-1 rounded-md hover:bg-accent transition-colors">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 class="text-xl font-semibold tracking-tight">Settings</h1>
      </div>

      {/* Profile */}
      {user && (
        <section class="mb-8">
          <h2 class="text-base font-medium mb-4">Profile</h2>
          <div class="flex items-center gap-4">
            {user.avatarUrl && (
              <img src={user.avatarUrl} alt="" class="w-10 h-10 rounded-full" />
            )}
            <div>
              <p class="text-sm font-medium">{user.displayName ?? user.email}</p>
              <p class="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </section>
      )}

      <div class="h-px bg-border my-8" />

      {/* Usage */}
      <section>
        <h2 class="text-base font-medium mb-4">Usage</h2>
        <div class="space-y-4">
          <div>
            <div class="flex items-center justify-between text-sm mb-1.5">
              <span>Storage</span>
              <span class="font-mono text-xs">{storageUsedMB} MB / {storageMaxMB} MB</span>
            </div>
            <div class="h-2 rounded-full bg-muted overflow-hidden">
              <div class="h-full rounded-full bg-primary transition-all" style={{ width: `${storagePercent}%` }} />
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between text-sm mb-1.5">
              <span>OCR Pages</span>
              <span class="font-mono text-xs">{usage?.totalPages ?? 0} / {usage?.maxPages ?? 500}</span>
            </div>
            <div class="h-2 rounded-full bg-muted overflow-hidden">
              <div class="h-full rounded-full bg-primary transition-all" style={{ width: `${pagePercent}%` }} />
            </div>
          </div>
          <p class="text-xs text-muted-foreground">
            {usage?.documentCount ?? 0} documents
          </p>
        </div>
      </section>

      <div class="h-px bg-border my-8" />

      {/* Logout */}
      <section>
        <Button variant="outline" onClick={handleLogout}>
          Sign out
        </Button>
      </section>
    </div>
  );
}
