export const equalsInsensitive = (value?: string) =>
  value ? { equals: value, mode: 'insensitive' as const } : undefined;
