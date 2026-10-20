import { expect, type Page } from '@playwright/test';

export type AppTab = 'AI Matchmaker' | 'Alumni Directory' | 'My Intros';

export async function openApp(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'OPM Community Hub' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Switch current user' })).toBeEnabled();
}

export async function openTab(page: Page, tab: AppTab) {
  await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click();
}

/** Uses the header "acting as" switcher, exactly like a person would. */
export async function actAs(page: Page, fullName: string) {
  const switcher = page.getByRole('button', { name: 'Switch current user' });
  await switcher.click();
  await page.getByRole('menuitem', { name: new RegExp(`^${fullName}`) }).click();
  await expect(switcher).toContainText(fullName);
}
