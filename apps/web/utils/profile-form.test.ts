import { describe, expect, it } from 'vitest';
import { makeProfile } from '@/test/fixtures';
import {
  buildUpdatePayload,
  hasProfileChanges,
  isProfileFormValid,
  parseSkills,
  profileToFormValues,
} from './profile-form';

describe('parseSkills', () => {
  it('trims, drops blanks and case-insensitive duplicates, keeping first spelling and order', () => {
    expect(parseSkills(' Payments, ,fundraising,payments ,  M&A ,')).toEqual([
      'Payments',
      'fundraising',
      'M&A',
    ]);
    expect(parseSkills('')).toEqual([]);
  });
});

describe('profile form helpers', () => {
  const profile = makeProfile({ skills: ['payments', 'fundraising'] });

  it('prefills from the profile and round-trips to an unchanged form', () => {
    const values = profileToFormValues(profile);
    expect(values.skills).toBe('payments, fundraising');
    expect(hasProfileChanges(profile, values)).toBe(false);
  });

  it('detects changes in any editable field, ignoring surrounding whitespace', () => {
    const values = profileToFormValues(profile);
    expect(hasProfileChanges(profile, { ...values, fullName: `  ${profile.fullName} ` })).toBe(
      false,
    );
    expect(hasProfileChanges(profile, { ...values, bio: 'New bio' })).toBe(true);
    expect(hasProfileChanges(profile, { ...values, skills: 'payments' })).toBe(true);
    expect(hasProfileChanges(profile, { ...values, city: 'Berlin' })).toBe(true);
  });

  it('builds a trimmed payload with only editable fields', () => {
    const payload = buildUpdatePayload({
      fullName: ' Anna K ',
      headline: ' CEO ',
      bio: ' Hello ',
      city: ' Berlin ',
      industry: ' Fintech ',
      skills: 'a, b',
    });
    expect(payload).toEqual({
      fullName: 'Anna K',
      headline: 'CEO',
      bio: 'Hello',
      city: 'Berlin',
      industry: 'Fintech',
      skills: ['a', 'b'],
    });
  });

  it('requires name, headline, city and industry but not bio or skills', () => {
    const values = profileToFormValues(profile);
    expect(isProfileFormValid({ ...values, bio: '', skills: '' })).toBe(true);
    for (const key of ['fullName', 'headline', 'city', 'industry'] as const) {
      expect(isProfileFormValid({ ...values, [key]: '   ' })).toBe(false);
    }
  });
});
