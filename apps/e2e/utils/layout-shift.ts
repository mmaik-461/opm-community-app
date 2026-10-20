import type { Page } from '@playwright/test';

declare global {
  interface Window {
    __layoutShift: number;
  }
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

/** Call before `page.goto`: accumulates browser-reported layout-shift scores. */
export async function trackLayoutShift(page: Page) {
  await page.addInitScript(() => {
    window.__layoutShift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        if (!entry.hadRecentInput) window.__layoutShift += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

/** Resets the counter so a test can measure only the interaction that follows. */
export function resetLayoutShift(page: Page) {
  return page.evaluate(() => {
    window.__layoutShift = 0;
  });
}

export async function readLayoutShift(page: Page): Promise<number> {
  // Layout-shift entries are delivered asynchronously; wait a frame before reading.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));
  return page.evaluate(() => window.__layoutShift);
}
