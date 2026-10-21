import { VerificationDecision } from '@opm/shared-types';
import { z } from 'zod';

export const decideVerificationSchema = z.object({
  decision: z.enum([VerificationDecision.APPROVE, VerificationDecision.REJECT]),
});
