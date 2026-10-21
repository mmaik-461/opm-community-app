import { expect, test } from '@playwright/test';
import { PROFILE_EDITOR } from '../constants';
import { actAs, expectSignedInAs, openApp, openEditProfile, openSection } from '../utils/app';

const NEW_BIO = 'Now advising climate-tech founders on cross-border expansion and fundraising.';
const NEW_SKILLS = ['climate finance', 'market entry', 'board advisory'];

test.describe('Profile editing', () => {
  test('edits bio and skills, and the changes persist after a reload', async ({ page }) => {
    await openApp(page);
    await actAs(page, PROFILE_EDITOR);

    await openEditProfile(page);
    const dialog = page.getByRole('dialog', { name: 'Edit your profile' });
    await expect(dialog.getByLabel('Full name')).toHaveValue(PROFILE_EDITOR);
    await expect(dialog.getByRole('button', { name: 'Save changes' })).toBeDisabled();

    await dialog.getByLabel('Bio').fill(NEW_BIO);
    await dialog.getByLabel('Skills').fill(NEW_SKILLS.join(', '));
    await dialog.getByRole('button', { name: 'Save changes' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText('Profile saved')).toBeVisible();

    // The directory shows the saved skills straight away...
    await openSection(page, 'Alumni Directory');
    const card = page.getByRole('heading', { name: PROFILE_EDITOR, level: 3 });
    await expect(card).toBeVisible();
    for (const skill of NEW_SKILLS) await expect(page.getByText(skill).first()).toBeVisible();

    // ...and after a full reload they come back from the database.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'OPM Community Hub' })).toBeVisible();
    await expectSignedInAs(page, PROFILE_EDITOR);
    await openEditProfile(page);
    const reopened = page.getByRole('dialog', { name: 'Edit your profile' });
    await expect(reopened.getByLabel('Bio')).toHaveValue(NEW_BIO);
    await expect(reopened.getByLabel('Skills')).toHaveValue(NEW_SKILLS.join(', '));
  });
});
