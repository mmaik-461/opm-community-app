import { describe, expect, it } from 'vitest';
import { EMPTY_REGISTER_VALUES } from '@/constants/auth';
import { makeProfile } from '@/test/fixtures';
import { buildQueryString, isAbortError } from './api';
import { errorMessage } from './errors';
import { formatDate, toPercent } from './format';
import { firstName, initials, matchesSearch, travelLabel, uniqueValues } from './profile';
import { buildRegisterPayload, checkPassword, currentYear, passwordError } from './register';
import { buildMailto, safeHttpUrl } from './url';

describe('api utils', () => {
  it('builds an encoded query string from mixed values', () => {
    const qs = buildQueryString({ userId: 'a b&c', receivedPage: 2, sentPage: 1 });
    const parsed = new URLSearchParams(qs);
    expect(parsed.get('userId')).toBe('a b&c');
    expect(parsed.get('receivedPage')).toBe('2');
    expect(qs).not.toContain('a b&c');
  });

  it('recognises only DOM AbortErrors', () => {
    expect(isAbortError(new DOMException('x', 'AbortError'))).toBe(true);
    expect(isAbortError(new DOMException('x', 'NetworkError'))).toBe(false);
    expect(isAbortError(new Error('AbortError'))).toBe(false);
  });
});

describe('errorMessage', () => {
  it('uses the Error message, otherwise the fallback', () => {
    expect(errorMessage(new Error('boom'), 'fallback')).toBe('boom');
    expect(errorMessage('boom', 'fallback')).toBe('fallback');
    expect(errorMessage(null, 'fallback')).toBe('fallback');
  });
});

describe('format', () => {
  it('formats an ISO date as short month, day and year', () => {
    // Locale-independent: year and day are always present; month text varies by locale.
    const out = formatDate('2026-03-05T12:00:00.000Z');
    expect(out).toContain('2026');
    expect(out).toContain('5');
    expect(out).not.toMatch(/\d:\d/);
    expect(out).not.toBe(formatDate('2026-09-05T12:00:00.000Z'));
  });

  it.each([
    [0.874, 87],
    [0, 0],
    [1, 100],
    [87.4, 87],
    [150, 100],
    [-0.5, 0],
  ])('toPercent(%d) -> %d', (input, expected) => {
    expect(toPercent(input)).toBe(expected);
  });
});

describe('profile utils', () => {
  it('derives up to two uppercase initials and ignores extra whitespace', () => {
    expect(initials('anna kowalska')).toBe('AK');
    expect(initials('  Jean   Luc  Picard ')).toBe('JL');
    expect(initials('Cher')).toBe('C');
    expect(initials('')).toBe('');
  });

  it('labels travel status and extracts the first name', () => {
    expect(travelLabel('TRAVELING_TO')).toBe('Traveling to');
    expect(travelLabel('LIVING_IN')).toBe('Living in');
    expect(firstName('Anna Maria Kowalska')).toBe('Anna');
  });

  const people = [
    makeProfile({ id: '1', city: 'London', cohort: 'OPM 9', industry: 'Fintech' }),
    makeProfile({ id: '2', city: 'Berlin', cohort: 'OPM 10', industry: 'CleanTech' }),
    makeProfile({ id: '3', city: 'London', cohort: 'OPM 48', industry: 'Fintech' }),
  ];

  it('lists unique filter values sorted naturally (OPM 9 before OPM 10)', () => {
    expect(uniqueValues(people, 'city')).toEqual(['Berlin', 'London']);
    expect(uniqueValues(people, 'cohort')).toEqual(['OPM 9', 'OPM 10', 'OPM 48']);
    expect(uniqueValues(people, 'industry')).toEqual(['CleanTech', 'Fintech']);
    expect(uniqueValues([], 'city')).toEqual([]);
  });

  describe('matchesSearch (expects a lowercased query)', () => {
    const p = makeProfile({ fullName: 'Anna Kowalska', skills: ['PSD2', 'fundraising'] });

    it.each(['anna', 'co-founder', 'warsaw', 'opm 48', 'fintech', 'psd2', 'raising'])(
      'finds %j across name, headline, city, cohort, industry and skills',
      (q) => expect(matchesSearch(p, q)).toBe(true),
    );

    it('does not match unrelated text or private fields', () => {
      expect(matchesSearch(p, 'zebra')).toBe(false);
      expect(matchesSearch(p, 'anna@example.com')).toBe(false);
    });
  });
});

describe('url utils', () => {
  it('only allows http(s) URLs and normalises them', () => {
    expect(safeHttpUrl('https://www.linkedin.com/in/anna')).toBe(
      'https://www.linkedin.com/in/anna',
    );
    expect(safeHttpUrl('http://example.com')).toBe('http://example.com/');
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('data:text/html,<script>')).toBeNull();
    expect(safeHttpUrl('not a url')).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });

  it('builds a mailto link whose subject and body round-trip through decoding', () => {
    const body = "Hi Anna & team,\nlet's talk? 100% yes";
    const href = buildMailto('anna@example.com', body)!;
    expect(href.startsWith('mailto:anna@example.com?')).toBe(true);
    const params = new URLSearchParams(href.split('?')[1]);
    expect(params.get('body')).toBe(body);
    expect(params.get('subject')).toBe('Connecting via OPM Community');
  });

  it('returns null without an email address', () => {
    expect(buildMailto(null, 'hi')).toBeNull();
    expect(buildMailto('', 'hi')).toBeNull();
  });
});

describe('register utils', () => {
  const values = {
    ...EMPTY_REGISTER_VALUES,
    fullName: ' Nina Novak ',
    email: ' nina@example.com ',
    password: ' keep spaces ',
    confirmPassword: ' keep spaces ',
    city: ' Prague ',
    industry: ' Fintech ',
    graduationYear: '2019',
  };

  it('trims text, keeps the password verbatim and sends the year as a number', () => {
    expect(buildRegisterPayload(values)).toEqual({
      fullName: 'Nina Novak',
      email: 'nina@example.com',
      password: ' keep spaces ',
      city: 'Prague',
      industry: 'Fintech',
      graduationYear: 2019,
    });
  });

  it('includes the diploma number only when provided', () => {
    expect(buildRegisterPayload({ ...values, diplomaNumber: ' D-1 ' }).diplomaNumber).toBe('D-1');
    expect(buildRegisterPayload({ ...values, diplomaNumber: '  ' })).not.toHaveProperty(
      'diplomaNumber',
    );
  });

  it('reads the current year from the given date', () => {
    expect(currentYear(new Date('2031-06-01T00:00:00Z'))).toBe(2031);
  });
});

describe('password utils', () => {
  const metIds = (password: string) =>
    checkPassword(password)
      .filter((c) => c.met)
      .map((c) => c.id);

  it('reports which rules a password satisfies', () => {
    expect(metIds('')).toEqual([]);
    expect(metIds('abc')).toEqual(['lowercase']);
    expect(metIds('Abcdef1!')).toEqual(['length', 'uppercase', 'lowercase', 'number', 'special']);
    expect(metIds('Abcdef1 ')).not.toContain('special');
  });

  it('flags weak passwords before mismatches, and accepts a matching strong one', () => {
    expect(passwordError('weak', 'weak')).toMatch(/meets every requirement/);
    expect(passwordError('Str0ng!Pass', 'Str0ng!Pasz')).toBe('Passwords do not match.');
    expect(passwordError('Str0ng!Pass', 'Str0ng!Pass')).toBeNull();
  });
});
