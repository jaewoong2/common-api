/**
 * Google OAuth Profile Types
 * @description Complete TypeScript definitions for Google OAuth 2.0 profile data
 * @see https://developers.google.com/identity/protocols/oauth2
 */

/**
 * Google Email Information
 */
export interface GoogleEmail {
  /** Email address */
  value: string;
  /** Whether email is verified */
  verified?: boolean;
  /** Email type (e.g., "account") */
  type?: string;
}

/**
 * Google Photo Information
 */
export interface GooglePhoto {
  /** Photo URL */
  value: string;
  /** Photo type (e.g., "default") */
  type?: string;
}

/**
 * Google Name Information
 */
export interface GoogleName {
  /** Family name (surname) */
  familyName?: string;
  /** Given name (first name) */
  givenName?: string;
}

/**
 * Raw Google OAuth User Info Response
 * @description The JSON response from Google's userinfo endpoint
 */
export interface GoogleUserInfo {
  /** Unique user ID */
  sub: string;
  /** User's full name */
  name?: string;
  /** User's given name (first name) */
  given_name?: string;
  /** User's family name (surname) */
  family_name?: string;
  /** User's profile picture URL */
  picture?: string;
  /** User's email address */
  email?: string;
  /** Whether email is verified */
  email_verified?: boolean;
  /** User's locale (e.g., "en") */
  locale?: string;
  /** Hosted domain (for Google Workspace accounts) */
  hd?: string;
}

/**
 * Complete Google OAuth Profile (Passport.js format)
 * @description The profile object returned by passport-google-oauth20 strategy
 */
export interface GoogleOAuthProfile {
  /** OAuth provider name */
  provider: "google";
  /** Unique user ID */
  id: string;
  /** User's display name */
  displayName: string;
  /** User's name components */
  name?: GoogleName;
  /** User's emails */
  emails?: GoogleEmail[];
  /** User's photos */
  photos?: GooglePhoto[];
  /** Raw JSON string from Google API */
  _raw: string;
  /** Parsed JSON object from Google API */
  _json: GoogleUserInfo;
}

/**
 * Type guard to check if profile is from Google
 */
export function isGoogleProfile(
  profile: unknown
): profile is GoogleOAuthProfile {
  return (
    typeof profile === "object" &&
    profile !== null &&
    "provider" in profile &&
    profile.provider === "google" &&
    "_json" in profile &&
    typeof profile._json === "object" &&
    profile._json !== null &&
    "sub" in profile._json
  );
}

/**
 * Extract email from Google profile (type-safe)
 */
export function extractGoogleEmail(
  profile: GoogleOAuthProfile
): string | undefined {
  return (
    profile.emails?.[0]?.value ||
    profile._json.email ||
    undefined
  );
}

/**
 * Extract verified email from Google profile
 */
export function extractGoogleVerifiedEmail(
  profile: GoogleOAuthProfile
): string | undefined {
  const primaryEmail = profile.emails?.[0];
  if (primaryEmail?.verified || profile._json.email_verified) {
    return extractGoogleEmail(profile);
  }
  return undefined;
}

/**
 * Extract profile picture from Google profile (type-safe)
 */
export function extractGooglePhoto(
  profile: GoogleOAuthProfile
): string | undefined {
  return profile.photos?.[0]?.value || profile._json.picture;
}

/**
 * Extract display name from Google profile (type-safe)
 */
export function extractGoogleDisplayName(profile: GoogleOAuthProfile): string {
  return (
    profile.displayName ||
    profile._json.name ||
    `${profile._json.given_name || ""} ${profile._json.family_name || ""}`.trim() ||
    profile._json.email ||
    "Unknown"
  );
}

/**
 * Build user profile object from Google OAuth data
 */
export function buildGoogleUserProfile(profile: GoogleOAuthProfile): {
  displayName: string;
  photo: string | undefined;
  email: string | undefined;
  emailVerified: boolean;
  givenName: string | undefined;
  familyName: string | undefined;
  locale: string | undefined;
} {
  return {
    displayName: extractGoogleDisplayName(profile),
    photo: extractGooglePhoto(profile),
    email: extractGoogleEmail(profile),
    emailVerified: profile._json.email_verified ?? false,
    givenName: profile._json.given_name || profile.name?.givenName,
    familyName: profile._json.family_name || profile.name?.familyName,
    locale: profile._json.locale,
  };
}
