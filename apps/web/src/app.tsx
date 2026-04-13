import type { JSX } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Router, type Route } from '@/lib/router';
import { LandingPage } from '@/pages/landing';
import { LoginPage } from '@/pages/login';
import { WikisPage } from '@/pages/wikis';
import { WikiDetailPage } from '@/pages/wiki-detail';
import { SettingsPage } from '@/pages/settings';

const routes: Route[] = [
  { pattern: '/', render: () => <LandingPage /> },
  { pattern: '/login', render: () => <LoginPage /> },
  { pattern: '/wikis', render: () => <WikisPage /> },
  {
    pattern: '/wikis/:slug',
    render: (params) => <WikiDetailPage slug={params.slug!} />,
  },
  {
    pattern: '/wikis/:slug/*',
    render: (params) => <WikiDetailPage slug={params.slug!} />,
  },
  { pattern: '/settings', render: () => <SettingsPage /> },
];

const notFound = (
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <h1 class="text-xl font-semibold">Not found</h1>
      <p class="mt-1 text-sm text-muted-foreground">No page matches this URL.</p>
    </div>
  </div>
);

export function App(): JSX.Element {
  return <Router routes={routes} notFound={notFound} />;
}
