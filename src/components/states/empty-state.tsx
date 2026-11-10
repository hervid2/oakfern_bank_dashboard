import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * The designed empty state (NFR-010, `ui-system` rule 7): icon, one sentence of
 * explanation, and the action that resolves it. Used by every data view so that
 * "nothing here" always looks deliberate.
 *
 * The icon is `aria-hidden`: the text carries the meaning.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly body: string;
  readonly action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] border border-border px-6 py-12 text-center">
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
      >
        <Icon className="size-5" />
      </span>
      <p className="text-base font-medium text-foreground">{title}</p>
      <p className="max-w-prose text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}
