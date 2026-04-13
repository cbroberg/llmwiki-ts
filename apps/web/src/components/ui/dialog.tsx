import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useCallback } from 'preact/hooks';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ComponentChildren;
}

export function Dialog({ open, onClose, children }: DialogProps): JSX.Element | null {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div class="relative z-50 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg animate-in fade-in-0 zoom-in-95">
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ class: className, ...props }: JSX.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div class={cn('mb-4', className as string)} {...props} />;
}

export function DialogTitle({ class: className, ...props }: JSX.HTMLAttributes<HTMLHeadingElement>): JSX.Element {
  return <h2 class={cn('text-lg font-semibold', className as string)} {...props} />;
}

export function DialogFooter({ class: className, ...props }: JSX.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div class={cn('mt-6 flex justify-end gap-3', className as string)} {...props} />;
}
