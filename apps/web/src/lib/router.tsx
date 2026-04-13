import { useState, useEffect, useCallback } from 'preact/hooks';
import type { ComponentChildren, JSX } from 'preact';

export type RouteParams = Record<string, string>;
export type RouteRender = (params: RouteParams) => JSX.Element;
export interface Route {
  pattern: string;
  render: RouteRender;
}

function compilePattern(pattern: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const parts = pattern.split('/').map((part) => {
    if (part.startsWith(':')) {
      keys.push(part.slice(1));
      return '([^/]+)';
    }
    if (part === '*') {
      keys.push('rest');
      return '(.+)';
    }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  return { regex: new RegExp(`^${parts.join('/')}$`), keys };
}

function matchRoute(
  routes: Route[],
  path: string,
): { render: RouteRender; params: RouteParams } | null {
  for (const route of routes) {
    const { regex, keys } = compilePattern(route.pattern);
    const match = path.match(regex);
    if (!match) continue;
    const params: RouteParams = {};
    keys.forEach((key, i) => {
      params[key] = decodeURIComponent(match[i + 1] ?? '');
    });
    return { render: route.render, params };
  }
  return null;
}

function currentPath(): string {
  return typeof window === 'undefined' ? '/' : window.location.pathname || '/';
}

export function navigate(to: string): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === to) return;
  window.history.pushState({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useLocation(): string {
  const [path, setPath] = useState<string>(currentPath);
  useEffect(() => {
    const handler = (): void => setPath(currentPath());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  return path;
}

export function useSearchParams(): URLSearchParams {
  const [params, setParams] = useState(() => new URLSearchParams(window.location.search));
  useEffect(() => {
    const handler = (): void => setParams(new URLSearchParams(window.location.search));
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  return params;
}

export function Router({
  routes,
  notFound,
}: {
  routes: Route[];
  notFound: JSX.Element;
}): JSX.Element {
  const path = useLocation();
  const match = matchRoute(routes, path);
  return match ? match.render(match.params) : notFound;
}

export function Link({
  href,
  children,
  class: className,
}: {
  href: string;
  children: ComponentChildren;
  class?: string;
}): JSX.Element {
  const onClick = useCallback(
    (event: MouseEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      navigate(href);
    },
    [href],
  );
  return (
    <a href={href} onClick={onClick} class={className}>
      {children}
    </a>
  );
}
