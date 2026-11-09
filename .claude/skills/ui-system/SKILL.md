---
name: ui-system
description: Use it when creating or modifying any screen, component, chart, table, form or dialog, to keep an original fintech design that is consistent, accessible and responsive in light and dark mode.
---
# Design system (original, inspired by fintech patterns)

## When it applies
Everything in `src/app/**` and `src/components/**`.

## Deterministic rules
1. **Originality:** no logos, names, copy, exact palettes or layouts copied from Mercury, Slash or any other fintech. The brand is the one defined in `docs/ux/ui-brief.md`.
2. **Tokens:**
   - colors are shadcn CSS variables (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--chart-1..5`…), defined for `:root` and `.dark`;
   - loose hex colors in components are **forbidden**;
   - cool neutrals and **a single accent**.
3. **Money semantics:**
   - inflows use `--positive`; outflows use the neutral foreground color (not red by default);
   - red (`--destructive`) is reserved for errors, failures and `failed` states;
   - color is never the only signal: add a sign (`+`/`−`), an icon or a label.
4. **Typography:**
   - one sans font (Inter or Geist);
   - figures use `tabular-nums` and are right-aligned in tables;
   - hierarchy: KPI (text-2xl/3xl, semibold) · label (text-sm, muted) · body (text-sm).
5. **Spacing and shape:**
   - Tailwind scale (4/6/8) and a consistent radius (`--radius`);
   - subtle borders instead of heavy shadows;
   - no decorative gradients.
6. **Layout:**
   - fixed sidebar at ≥ 1024 px, a *sheet* on mobile, content within `max-w-screen-2xl`;
   - tables at ≥ 768 px; below that, a card list;
   - verified breakpoints: 375, 768, 1280 and 1440 px.
7. **Mandatory states** in every data view:
   - loading: a Skeleton shaped like the content;
   - empty: icon + message + action;
   - error: a human message + retry, with `error.tsx` per segment;
   - success: a sonner toast.
8. **Forms:**
   - React Hook Form + Zod (the same schema as the server, when possible);
   - inline validation on blur;
   - submit button disabled and showing a spinner while processing;
   - errors linked with `aria-describedby`.
9. **Money actions:**
   - always a **review** step before confirming, with a clear summary (from / to / amount / method / estimated arrival);
   - a button with the concrete verb ("Send $1,250.00");
   - destructive actions (cancel payment, freeze card) get a confirmation dialog.
10. **Charts (Recharts via shadcn charts):**
    - `--chart-*` colors;
    - tooltip with formatted amount and date; axes with compact format (`$1.2M`);
    - clickable legend when there are several series;
    - responsive with `ResponsiveContainer`;
    - each chart has a descriptive `aria-label` and a text alternative (summary or table);
    - clicking a bar or segment navigates to Transactions with the equivalent filters in the URL.
11. **Accessibility:**
    - WCAG 2.2 AA target;
    - visible focus; everything keyboard-operable;
    - text contrast ≥ 4.5:1;
    - `prefers-reduced-motion` respected;
    - labels on every input; icon buttons with `aria-label`.
12. **Motion:** transitions ≤ 200 ms, and only on hover, panel opening and state changes.

## Correct examples
- **Transaction row:**
  - avatar with the counterparty's initial;
  - name + method (muted) and category (badge);
  - date;
  - right-aligned `tabular-nums` amount, e.g. `+$2,400.00` in `--positive`.
- **KPI card:** label "Total cash" · value · delta vs. last month with an arrow + text ("↑ 4.2% vs last month").

## Anti-examples
- 12 KPI cards with gradients and shadows.
- Red/green as the only signal.
- Full-page spinners.
- Tables overflowing on mobile.
- Hardcoded `#16a34a`.

## Verification
- Playwright at 375 and 1280 viewports with no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`).
- `@axe-core/playwright` with no *serious* or *critical* violations on Home, Transactions and Move money.
- Light and dark screenshots attached to the e2e validation.
