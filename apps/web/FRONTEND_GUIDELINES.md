# Frontend Design & UI Standards

- **Aesthetic**: Premium, executive-level SaaS application (Linear / Stripe style).
- **Color & Contrast**: Deep zinc/slate dark accents, soft neutral backgrounds, subtle borders (`border-zinc-200 dark:border-zinc-800`).
- **Typography**: Geist font with high-clarity hierarchy. Uppercase tracking labels for tags/metadata (`text-xs font-semibold tracking-wider uppercase text-zinc-500`).
- **Cards & Visual Depth**:
  - Cards with subtle borders, smooth hover elevations (`hover:border-zinc-300 transition-all duration-200 hover:shadow-sm`).
  - Distinct subtle tinted callouts for AI-generated insights.
- **Interactivity**:
  - Immediate visual feedback on actions (e.g. "Copied!" badge transition with Check icon).
  - Multi-stage animated skeleton loaders during AI matchmaking calls.

## Responsive Design (Mobile-First by Default)

- **Mobile-first**: write base classes for < 640px, then layer `sm:` (640px), `md:`, `lg:` (1024px), `xl:` overrides. Every new component must work at 360px width with no horizontal page scroll.
- **Breakpoints**: mobile < 640px, tablet 640–1024px, desktop > 1024px.
- **Grids**: card lists use `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3` (match results: `xl:grid-cols-3`).
- **Headers/toolbars**: use `flex-wrap` with `gap-x/gap-y`; truncate long text (`min-w-0 truncate`) and cap widths of dropdown triggers on mobile.
- **Chip rows**: wrap (`flex-wrap`) or scroll horizontally with `overflow-x-auto snap-x` and `shrink-0 snap-start` items on mobile.
- **Actions**: primary buttons are full width on mobile (`w-full sm:w-auto`); touch targets are at least 36px high.
- **Layout stability**: async/filtered result areas reserve height (`min-h-[450px]`) and show a centered empty state so the footer never jumps.
- **Input handling**: debounce text filters (250–300ms) before filtering large lists.
