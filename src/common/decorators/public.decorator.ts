import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for public endpoints
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as public, bypassing authentication guards
 * @example
 * @Get('health')
 * @Public()
 * async healthCheck() { }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
