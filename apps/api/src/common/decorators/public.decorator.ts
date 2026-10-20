import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constants/auth';

/** Opts a route (or controller) out of the global `AuthGuard`. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
