import { expect, test } from '@playwright/test';
import { API_URL, DEFAULT_USER, E2E_SEED_PASSWORD, PASSWORD_USER } from '../constants';
import { fetchProfiles } from '../utils/api';
import { openApp, openSection, quickLogin } from '../utils/app';

test.describe('Authentication', () => {
  test('shows only the sign-in screen to an anonymous visitor', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
    await expect(
      page.getByRole('heading', { name: /Sign in to the OPM Community Hub/ }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Alumni Directory' })).toHaveCount(0);
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByText('Development quick login')).toBeVisible();
  });

  test('sends a signed-out visitor to /login and back to the page they asked for', async ({
    page,
    request,
  }) => {
    const [first] = await fetchProfiles(request);
    await page.goto('/directory');
    await expect(page).toHaveURL('/login?callbackUrl=%2Fdirectory');
    await expect(page).toHaveTitle(/Sign in/);

    await quickLogin(page, first.fullName);
    await expect(page).toHaveURL('/directory');
    await expect(page).toHaveTitle(/Alumni Directory/);
    await expect(page.getByRole('button', { name: 'Switch current user' })).toContainText(
      first.fullName,
    );
  });

  test('keeps signed-in users off /login and /register', async ({ page }) => {
    await openApp(page);
    await page.goto('/login');
    await expect(page).toHaveURL('/');
    await page.goto('/register');
    await expect(page).toHaveURL('/');
  });

  test('gives every section its own URL, title and working back button', async ({ page }) => {
    await openApp(page);
    await expect(page).toHaveTitle(/AI Matchmaker/);

    await openSection(page, 'Alumni Directory');
    await expect(page).toHaveTitle(/Alumni Directory/);
    await expect(page.getByRole('link', { name: 'Alumni Directory' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await openSection(page, 'My Intros');
    await expect(page).toHaveTitle(/My Intros/);

    await page.goBack();
    await expect(page).toHaveURL('/directory');
    await page.goBack();
    await expect(page).toHaveURL('/');

    // A deep link renders the section directly, signed in, after a full load.
    await page.goto('/intros');
    await expect(page.getByRole('button', { name: 'Switch current user' })).toBeVisible();
    await expect(page.getByRole('link', { name: /^My Intros/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('renders the signed-in page on the server, before any script runs', async ({ page }) => {
    await openApp(page);
    // A plain HTTP request (no JavaScript) with the session cookie already contains the app.
    const html = await (await page.request.get('/directory')).text();
    expect(html).toContain('<title>Alumni Directory · OPM Community Hub</title>');
    expect(html).toContain(DEFAULT_USER);
    expect(html).toContain('Primary');
  });

  test('signs in with email and password, survives a reload, and signs out', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill(PASSWORD_USER.email);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Invalid email or password.' }),
    ).toBeVisible();

    await page.getByLabel('Password').fill(E2E_SEED_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('button', { name: 'Switch current user' })).toContainText(
      PASSWORD_USER.fullName,
    );

    // The session is a cookie, so it outlives the page.
    await page.reload();
    await expect(page.getByRole('button', { name: 'Switch current user' })).toContainText(
      PASSWORD_USER.fullName,
    );

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL('/login');
    await expect(
      page.getByRole('heading', { name: /Sign in to the OPM Community Hub/ }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: /Sign in to the OPM Community Hub/ }),
    ).toBeVisible();
  });

  test('quick login lands on the app as the chosen alumnus', async ({ page, request }) => {
    const [first] = await fetchProfiles(request);
    await page.goto('/');
    await quickLogin(page, first.fullName);
    await expect(page.getByRole('button', { name: 'Switch current user' })).toContainText(
      first.fullName,
    );
  });

  test('the API rejects unauthenticated and forged requests', async ({ request }) => {
    const [alice, bob] = await fetchProfiles(request);

    for (const res of [
      await request.get(`${API_URL}/profiles`),
      await request.get(`${API_URL}/intros`),
      await request.post(`${API_URL}/intros`, {
        data: { targetId: bob.id, query: 'q', icebreaker: 'hi' },
      }),
      await request.get(`${API_URL}/intros`, {
        headers: { Authorization: 'Bearer forged.token.here' },
      }),
    ]) {
      expect(res.status()).toBe(401);
    }

    // Identity in the payload is not an identity.
    const spoof = await request.post(`${API_URL}/intros`, {
      data: { requesterId: alice.id, targetId: bob.id, query: 'q', icebreaker: 'hi' },
    });
    expect(spoof.status()).toBe(401);
  });
});
