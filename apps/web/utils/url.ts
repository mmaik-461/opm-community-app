import { EMAIL_SUBJECT } from '@/constants/matchmaker';

export function safeHttpUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export function buildMailto(email: string | null, body: string): string | null {
  if (!email) return null;
  return `mailto:${email}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(body)}`;
}
