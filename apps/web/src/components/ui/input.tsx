import type { JSX } from 'preact';
import { cn } from '@/lib/utils';

type InputProps = JSX.HTMLAttributes<HTMLInputElement>;

export function Input({ class: className, ...props }: InputProps): JSX.Element {
  return (
    <input
      class={cn(
        'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className as string,
      )}
      {...props}
    />
  );
}
