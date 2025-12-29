/**
 * Kakao OAuth Profile Types
 * @description TypeScript definitions based on actual Kakao OAuth 2.0 profile data
 */

/**
 * Kakao User Properties
 */
export interface KakaoProperties {
  nickname: string;
  profile_image: string;
  thumbnail_image: string;
}

/**
 * Kakao Account Profile Information
 */
export interface KakaoAccountProfile {
  nickname: string;
  thumbnail_image_url: string;
  profile_image_url: string;
  is_default_image: boolean;
  is_default_nickname: boolean;
}

/**
 * Kakao Account Information
 */
export interface KakaoAccount {
  profile_nickname_needs_agreement: boolean;
  profile_image_needs_agreement: boolean;
  profile: KakaoAccountProfile;
  email?: string;
}

/**
 * Raw Kakao OAuth User Info Response (_json)
 */
export interface KakaoUserInfo {
  id: number;
  connected_at: string;
  properties: KakaoProperties;
  kakao_account: KakaoAccount;
}

/**
 * Complete Kakao OAuth Profile (Passport.js format)
 */
export interface KakaoOAuthProfile {
  provider: "kakao";
  id: number;
  username: string;
  displayName: string;
  _raw: string;
  _json: KakaoUserInfo;
}

/**
 * Type guard to check if profile is from Kakao
 */
export function isKakaoProfile(
  profile: unknown
): profile is KakaoOAuthProfile {
  return (
    typeof profile === "object" &&
    profile !== null &&
    "provider" in profile &&
    profile.provider === "kakao" &&
    "_json" in profile &&
    typeof profile._json === "object" &&
    profile._json !== null &&
    "kakao_account" in profile._json
  );
}

/**
 * Extract email from Kakao profile (type-safe)
 */
export function extractKakaoEmail(
  profile: KakaoOAuthProfile
): string | undefined {
  return profile._json.kakao_account.email;
}

/**
 * Extract profile image from Kakao profile (type-safe)
 */
export function extractKakaoProfileImage(
  profile: KakaoOAuthProfile
): string | undefined {
  return (
    profile._json.kakao_account.profile?.profile_image_url ||
    profile._json.properties?.profile_image
  );
}

/**
 * Extract thumbnail image from Kakao profile (type-safe)
 */
export function extractKakaoThumbnail(
  profile: KakaoOAuthProfile
): string | undefined {
  return (
    profile._json.kakao_account.profile?.thumbnail_image_url ||
    profile._json.properties?.thumbnail_image
  );
}

/**
 * Extract nickname from Kakao profile (type-safe)
 */
export function extractKakaoNickname(profile: KakaoOAuthProfile): string {
  return (
    profile._json.kakao_account.profile?.nickname ||
    profile._json.properties?.nickname ||
    profile.displayName
  );
}

/**
 * Build user profile object from Kakao OAuth data
 */
export function buildKakaoUserProfile(profile: KakaoOAuthProfile): {
  displayName: string;
  photo: string | undefined;
  email: string | undefined;
  thumbnail: string | undefined;
  isDefaultImage: boolean;
  isDefaultNickname: boolean;
} {
  return {
    displayName: extractKakaoNickname(profile),
    photo: extractKakaoProfileImage(profile),
    email: extractKakaoEmail(profile),
    thumbnail: extractKakaoThumbnail(profile),
    isDefaultImage:
      profile._json.kakao_account.profile?.is_default_image ?? false,
    isDefaultNickname:
      profile._json.kakao_account.profile?.is_default_nickname ?? false,
  };
}
