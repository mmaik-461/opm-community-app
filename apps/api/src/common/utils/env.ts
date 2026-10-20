import { ServiceUnavailableException } from '@nestjs/common';

export function requireEnvKey<T>(name: string, build: (key: string) => T): T {
  const key = process.env[name]?.trim();
  if (!key) throw new ServiceUnavailableException(`${name} is not configured`);
  return build(key);
}
