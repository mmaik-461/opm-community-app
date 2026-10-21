import { expect, type Page } from '@playwright/test';
import { DEFAULT_USER, LOGIN_PATH, MATCHMAKER_PATH } from '../constants';

export type AppSection =
  'AI Matchmaker' | 'Alumni Directory' | 'My Intros' | 'Verifications' | 'Feedback Analytics';

/** Signs in through the development quick-login list, like a developer switching accounts. */
export async function quickLogin(page: Page, fullName: string) {
  await page.getByRole('button', { name: new RegExp(`^Continue as ${fullName}`) }).click();
}

/**
 * Opens the app signed in (as `DEFAULT_USER` unless told otherwise) so protected data loads.
 * The session is a cookie, so a revisit within the same test is already signed in.
 */
export async function openApp(page: Page, signInAs: string = DEFAULT_USER) {
  await page.goto(LOGIN_PATH);
  const menu = accountMenu(page);
  const signIn = page.getByRole('button', { name: new RegExp(`^Continue as ${signInAs}`) });
  await expect(menu.or(signIn)).toBeVisible();
  if (await signIn.isVisible()) await signIn.click();
  await expect(page.getByRole('heading', { name: 'OPM Community Hub' })).toBeVisible();
  await expect(menu).toBeEnabled();
}

const SECTION_PATH: Record<AppSection, string> = {
  'AI Matchmaker': MATCHMAKER_PATH,
  'Alumni Directory': '/directory',
  'My Intros': '/intros',
  Verifications: '/admin',
  'Feedback Analytics': '/admin/feedback',
};

/** Follows the header link to a section, like a person would, and waits for its URL. */
export async function openSection(page: Page, section: AppSection) {
  await page.getByRole('link', { name: new RegExp(`^${section}`) }).click();
  await expect(page).toHaveURL(SECTION_PATH[section]);
}

/** The circular avatar button in the header; its accessible name carries the signed-in user's name. */
export const accountMenu = (page: Page) => page.getByRole('button', { name: /^Account menu/ });

export async function expectSignedInAs(page: Page, fullName: string) {
  await expect(accountMenu(page)).toHaveAccessibleName(`Account menu, ${fullName}`);
}

/** Opens the avatar dropdown; every account action (edit, switch user, sign out) lives in it. */
export async function openAccountMenu(page: Page) {
  await accountMenu(page).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  return menu;
}

export async function openEditProfile(page: Page) {
  const menu = await openAccountMenu(page);
  await menu.getByRole('menuitem', { name: 'Edit profile' }).click();
}

export async function signOut(page: Page) {
  const menu = await openAccountMenu(page);
  await menu.getByRole('menuitem', { name: 'Sign out' }).click();
}

/** Uses the dev "Acting as" list in the avatar menu, exactly like a person would. */
export async function actAs(page: Page, fullName: string) {
  const menu = await openAccountMenu(page);
  await menu.getByRole('menuitemradio', { name: new RegExp(`^${fullName}`) }).click();
  await expectSignedInAs(page, fullName);
}
