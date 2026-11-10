/**
 * The Oakfern wordmark (ui-brief §1): a lowercase `oakfern` at semibold next to
 * a 20×20 rounded square holding an abstract two-stroke fern leaf, drawn in the
 * teal accent.
 *
 * Original and inline. No raster asset, no external logo, no resemblance to any
 * real bank or fintech mark (Art. 3, `ui-system` rule 1). The same two paths are
 * duplicated once, in `src/app/icon.svg`, because a favicon cannot import a
 * React component.
 *
 * Accessibility: when the text is rendered the mark is `aria-hidden`, because the
 * adjacent word already carries the brand and a labelled `role="img"` would make
 * a screen reader announce "Oakfern oakfern". With `withText={false}` the mark
 * is the only brand element, so it takes the label itself.
 */

interface WordmarkProps {
  readonly size?: 'sm' | 'md';
  readonly withText?: boolean;
  readonly className?: string;
}

const MARK_SIZE = { sm: 'size-5', md: 'size-6' } as const;
const TEXT_SIZE = { sm: 'text-sm', md: 'text-base' } as const;

export function Wordmark({ size = 'md', withText = true, className }: WordmarkProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`.trim()}>
      <svg
        viewBox="0 0 20 20"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${MARK_SIZE[size]} shrink-0 text-primary`}
        {...(withText ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'Oakfern' })}
      >
        <rect
          x="0.85"
          y="0.85"
          width="18.3"
          height="18.3"
          rx="5.4"
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="1.3"
        />
        <path
          d="M10 16.6V8.4c0-2.9 1.9-5 4.7-5.5.1 3.9-1.7 6.6-4.7 7.5"
          stroke="currentColor"
          strokeWidth="1.45"
        />
        <path
          d="M10 13.1c-2.5-.7-4.1-2.9-4.5-6.3 2.6.8 4.1 2.7 4.5 5"
          stroke="currentColor"
          strokeWidth="1.45"
        />
      </svg>
      {withText ? (
        <span className={`${TEXT_SIZE[size]} font-semibold tracking-tight text-foreground`}>
          oakfern
        </span>
      ) : null}
    </span>
  );
}
