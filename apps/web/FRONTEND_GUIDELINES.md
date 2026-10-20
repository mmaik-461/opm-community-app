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
