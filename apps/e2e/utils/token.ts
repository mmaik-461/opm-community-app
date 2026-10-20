/** Reads the user id (JWT `sub`) from a bearer Authorization header; the API verifies it, tests only inspect it. */
export function userIdFromAuthorization(header: string | undefined): string | undefined {
  const token = header?.split(' ')[1];
  const payload = token?.split('.')[1];
  if (!payload) return undefined;
  return (JSON.parse(Buffer.from(payload, 'base64url').toString()) as { sub?: string }).sub;
}
