import { z } from 'zod';

export const requiredText = (max: number) => z.string().trim().min(1).max(max);
