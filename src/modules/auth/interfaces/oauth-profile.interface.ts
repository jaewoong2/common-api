import { KakaoOAuthProfile } from './kakao-profile.interface';
import { GoogleOAuthProfile } from './google-profile.interface';

/**
 * Discriminated union of all supported OAuth profiles
 * @description Use this type for type-safe OAuth profile handling
 */
export type OAuthProfile = KakaoOAuthProfile | GoogleOAuthProfile;

/**
 * OAuth Provider Names
 */
export type OAuthProviderType = 'google' | 'kakao';

/**
 * Generic OAuth profile fields (legacy - prefer specific types)
 * @deprecated Use KakaoOAuthProfile or GoogleOAuthProfile directly
 */
export interface BaseOAuthProfile {
  id: string | number;
  provider?: string;
  displayName?: string;
  emails?: Array<{ value: string; verified?: boolean }>;
  photos?: Array<{ value: string }>;
  _json?: Record<string, unknown>;
  _raw?: string;
}

/**
 * Type guard to determine OAuth provider
 */
export function getOAuthProvider(profile: OAuthProfile): OAuthProviderType {
  return profile.provider;
}

/**
 * Extract provider-specific user ID (normalized to string)
 */
export function extractOAuthUserId(profile: OAuthProfile): string {
  if (profile.provider === 'kakao') {
    return profile.id.toString();
  }
  return profile.id;
}
