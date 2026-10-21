import { expect, type Page } from '@playwright/test';
import { DEFAULT_USER } from '../constants';

export type AppSection = 'AI Matchmaker' | 'Alumni Directory' | 'My Intros' | 'Verifications';

/** Signs in through the development quick-login list, like a developer switching accounts. */
export async function quickLogin(page: Page, fullName: string) {
  await page.getByRole('button', { name: new RegExp(`^Continue as ${fullName}`) }).click();
}

/**
 * Opens the app signed in (as `DEFAULT_USER` unless told otherwise) so protected data loads.
 * The session is a cookie, so a revisit within the same test is already signed in.
 */
export async function openApp(page: Page, signInAs: string = DEFAULT_USER) {
  await page.goto('/');
  const switcher = page.getByRole('button', { name: 'Switch current user' });
  const signIn = page.getByRole('button', { name: new RegExp(`^Continue as ${signInAs}`) });
  await expect(switcher.or(signIn)).toBeVisible();
  if (await signIn.isVisible()) await signIn.click();
  await expect(page.getByRole('heading', { name: 'OPM Community Hub' })).toBeVisible();
  await expect(switcher).toBeEnabled();
}

const SECTION_PATH: Record<AppSection, string> = {
  'AI Matchmaker': '/',
  'Alumni Directory': '/directory',
  'My Intros': '/intros',
  Verifications: '/admin',
};

/** Follows the header link to a section, like a person would, and waits for its URL. */
export async function openSection(page: Page, section: AppSection) {
  await page.getByRole('link', { name: new RegExp(`^${section}`) }).click();
  await expect(page).toHaveURL(SECTION_PATH[section]);
}

/** Uses the header "acting as" switcher, exactly like a person would. */
export async function actAs(page: Page, fullName: string) {
  const switcher = page.getByRole('button', { name: 'Switch current user' });
  await switcher.click();
  await page.getByRole('menuitem', { name: new RegExp(`^${fullName}`) }).click();
  await expect(switcher).toContainText(fullName);
}
