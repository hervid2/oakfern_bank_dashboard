import type { ReactNode } from 'react';

/**
 * A route's page header: exactly one `<h1>`, a sentence of context, and the
 * section's content below it. Keeping the heading here is what makes
 * "one `<h1>` per page" structural instead of a convention everyone has to
 * remember.
 */
export function SectionPlaceholder({
  title,
  body,
  children,
}: {
  readonly title: string;
  readonly body: string;
  readonly children?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="max-w-prose text-sm text-muted-foreground">{body}</p>
      </header>
      {children}
    </section>
  );
}
