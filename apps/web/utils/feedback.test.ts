import { describe, expect, it } from 'vitest';
import { feedbackReasonFor, formatPercent } from './feedback';

describe('feedbackReasonFor', () => {
  it('tags every thumbs up as a great match, whatever was chosen', () => {
    expect(feedbackReasonFor('POSITIVE', null)).toBe('GREAT_MATCH');
    expect(feedbackReasonFor('POSITIVE', 'SKILL_MISMATCH')).toBe('GREAT_MATCH');
  });

  it('passes the chosen reason of a thumbs down, and none when nothing was chosen', () => {
    expect(feedbackReasonFor('NEGATIVE', 'DIFFERENT_INDUSTRY')).toBe('DIFFERENT_INDUSTRY');
    expect(feedbackReasonFor('NEGATIVE', 'OTHER')).toBe('OTHER');
    expect(feedbackReasonFor('NEGATIVE', null)).toBeUndefined();
  });

  it('never sends GREAT_MATCH with a thumbs down', () => {
    expect(feedbackReasonFor('NEGATIVE', 'GREAT_MATCH')).toBeUndefined();
  });
});

describe('formatPercent', () => {
  it('appends a percent sign', () => {
    expect(formatPercent(67)).toBe('67%');
    expect(formatPercent(0)).toBe('0%');
  });
});
