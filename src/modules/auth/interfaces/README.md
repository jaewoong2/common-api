# OAuth Profile Type System

Complete TypeScript type definitions for OAuth 2.0 profiles from Google and Kakao providers.

## Overview

This module provides **fully type-safe** OAuth profile handling with:

- ✅ **Complete type coverage** for Kakao and Google OAuth responses
- ✅ **Type guards** for runtime type checking
- ✅ **Helper functions** for safe data extraction
- ✅ **Discriminated unions** for compile-time type narrowing
- ✅ **Builder functions** for creating user profiles

## Quick Start

```typescript
import { OAuthProfile } from './oauth-profile.interface';
import { 
  isKakaoProfile, 
  buildKakaoUserProfile 
} from './kakao-profile.interface';
import { 
  isGoogleProfile, 
  buildGoogleUserProfile 
} from './google-profile.interface';

function handleOAuthProfile(profile: OAuthProfile) {
  if (isKakaoProfile(profile)) {
    // TypeScript knows this is KakaoOAuthProfile
    const kakaoData = buildKakaoUserProfile(profile);
    console.log('Kakao User:', kakaoData.displayName, kakaoData.email);
  } else if (isGoogleProfile(profile)) {
    // TypeScript knows this is GoogleOAuthProfile
    const googleData = buildGoogleUserProfile(profile);
    console.log('Google User:', googleData.displayName, googleData.email);
  }
}
```

## Kakao OAuth Profile

### Type Structure

```typescript
interface KakaoOAuthProfile {
  provider: "kakao";
  id: number;
  username: string;
  displayName: string;
  _raw: string;
  _json: {
    id: number;
    connected_at: string;
    properties: {
      nickname: string;
      profile_image: string;
      thumbnail_image: string;
    };
    kakao_account: {
      // Always included
      profile_nickname_needs_agreement: boolean;
      profile_image_needs_agreement: boolean;
      profile: {
        nickname: string;
        thumbnail_image_url: string;
        profile_image_url: string;
        is_default_image: boolean;
        is_default_nickname: boolean;
      };
      
      // Optional (requires user consent)
      email?: string;
      email_needs_agreement?: boolean;
      is_email_valid?: boolean;
      is_email_verified?: boolean;
      age_range?: string;
      birthday?: string; // MMDD format
      gender?: "male" | "female";
      phone_number?: string;
    };
  };
}
```

### Type Guard

```typescript
import { isKakaoProfile } from './kakao-profile.interface';

if (isKakaoProfile(profile)) {
  // TypeScript automatically narrows type to KakaoOAuthProfile
  console.log(profile._json.id); // number
  console.log(profile._json.properties.nickname); // string
}
```

### Data Extraction

```typescript
import {
  extractKakaoEmail,
  extractKakaoNickname,
  extractKakaoProfileImage,
  extractKakaoThumbnail,
} from './kakao-profile.interface';

const email = extractKakaoEmail(profile); // string | undefined
const nickname = extractKakaoNickname(profile); // string (never undefined)
const profileImage = extractKakaoProfileImage(profile); // string | undefined
const thumbnail = extractKakaoThumbnail(profile); // string | undefined
```

### Complete Profile Builder

```typescript
import { buildKakaoUserProfile } from './kakao-profile.interface';

const userData = buildKakaoUserProfile(profile);
/*
Returns:
{
  displayName: string;
  photo: string | undefined;
  email: string | undefined;
  thumbnail: string | undefined;
  isDefaultImage: boolean;
  isDefaultNickname: boolean;
}
*/
```

### Handling User Consent

Kakao OAuth requires explicit user consent for certain fields:

```typescript
const { kakao_account } = profile._json;

// Check email consent
if (!kakao_account.email_needs_agreement && kakao_account.email) {
  console.log('Email (consented):', kakao_account.email);
  console.log('Email verified:', kakao_account.is_email_verified);
} else {
  console.log('Email requires user consent');
}

// Check age range consent
if (!kakao_account.age_range_needs_agreement && kakao_account.age_range) {
  console.log('Age Range:', kakao_account.age_range);
}

// Check birthday consent
if (!kakao_account.birthday_needs_agreement && kakao_account.birthday) {
  console.log('Birthday (MMDD):', kakao_account.birthday);
}
```

## Google OAuth Profile

### Type Structure

```typescript
interface GoogleOAuthProfile {
  provider: "google";
  id: string;
  displayName: string;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  emails?: Array<{
    value: string;
    verified?: boolean;
  }>;
  photos?: Array<{
    value: string;
  }>;
  _raw: string;
  _json: {
    sub: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    email?: string;
    email_verified?: boolean;
    locale?: string;
    hd?: string; // Hosted domain (Google Workspace)
  };
}
```

### Type Guard

```typescript
import { isGoogleProfile } from './google-profile.interface';

if (isGoogleProfile(profile)) {
  // TypeScript automatically narrows type to GoogleOAuthProfile
  console.log(profile._json.sub); // string
  console.log(profile._json.email_verified); // boolean | undefined
}
```

### Data Extraction

```typescript
import {
  extractGoogleEmail,
  extractGoogleVerifiedEmail,
  extractGoogleDisplayName,
  extractGooglePhoto,
} from './google-profile.interface';

const email = extractGoogleEmail(profile); // string | undefined
const verifiedEmail = extractGoogleVerifiedEmail(profile); // string | undefined (only if verified)
const displayName = extractGoogleDisplayName(profile); // string (never undefined)
const photo = extractGooglePhoto(profile); // string | undefined
```

### Complete Profile Builder

```typescript
import { buildGoogleUserProfile } from './google-profile.interface';

const userData = buildGoogleUserProfile(profile);
/*
Returns:
{
  displayName: string;
  photo: string | undefined;
  email: string | undefined;
  emailVerified: boolean;
  givenName: string | undefined;
  familyName: string | undefined;
  locale: string | undefined;
}
*/
```

### Email Verification

```typescript
// Extract only verified emails
const verifiedEmail = extractGoogleVerifiedEmail(profile);
if (verifiedEmail) {
  console.log('Verified email:', verifiedEmail);
} else {
  console.log('Email not verified or not provided');
}

// Or check manually
if (profile._json.email_verified) {
  console.log('Email:', profile._json.email);
}
```

## Generic OAuth Profile

The `OAuthProfile` type is a discriminated union of all provider-specific types:

```typescript
type OAuthProfile = KakaoOAuthProfile | GoogleOAuthProfile;
```

### Provider Detection

```typescript
import { getOAuthProvider, extractOAuthUserId } from './oauth-profile.interface';

const provider = getOAuthProvider(profile); // "google" | "kakao"
const userId = extractOAuthUserId(profile); // string (normalized)
```

### Pattern Matching

```typescript
function processProfile(profile: OAuthProfile) {
  switch (profile.provider) {
    case 'kakao': {
      // TypeScript knows this is KakaoOAuthProfile
      const kakaoId = profile._json.id; // number
      return buildKakaoUserProfile(profile);
    }
    
    case 'google': {
      // TypeScript knows this is GoogleOAuthProfile
      const googleId = profile._json.sub; // string
      return buildGoogleUserProfile(profile);
    }
    
    default: {
      // TypeScript ensures all cases are handled (exhaustiveness check)
      const _exhaustive: never = profile;
      throw new Error('Unknown provider');
    }
  }
}
```

## Real-World Usage Examples

### Example 1: User Registration

```typescript
async function registerOAuthUser(profile: OAuthProfile): Promise<User> {
  if (isKakaoProfile(profile)) {
    const data = buildKakaoUserProfile(profile);
    
    if (!data.email) {
      throw new Error('Kakao email consent required');
    }
    
    return createUser({
      provider: 'kakao',
      providerId: profile._json.id.toString(),
      email: data.email,
      displayName: data.displayName,
      profileImage: data.photo,
      metadata: {
        isDefaultImage: data.isDefaultImage,
        connectedAt: profile._json.connected_at,
      },
    });
  }
  
  if (isGoogleProfile(profile)) {
    const data = buildGoogleUserProfile(profile);
    
    if (!data.email || !data.emailVerified) {
      throw new Error('Google verified email required');
    }
    
    return createUser({
      provider: 'google',
      providerId: profile._json.sub,
      email: data.email,
      displayName: data.displayName,
      profileImage: data.photo,
      metadata: {
        givenName: data.givenName,
        familyName: data.familyName,
        locale: data.locale,
      },
    });
  }
  
  throw new Error('Unknown OAuth provider');
}
```

### Example 2: Profile Update

```typescript
async function updateUserProfile(profile: OAuthProfile): Promise<void> {
  const userId = extractOAuthUserId(profile);
  
  if (isKakaoProfile(profile)) {
    await updateUser(userId, {
      displayName: extractKakaoNickname(profile),
      profileImage: extractKakaoProfileImage(profile),
      thumbnail: extractKakaoThumbnail(profile),
    });
  } else if (isGoogleProfile(profile)) {
    await updateUser(userId, {
      displayName: extractGoogleDisplayName(profile),
      profileImage: extractGooglePhoto(profile),
    });
  }
}
```

### Example 3: Email Extraction with Fallback

```typescript
function getVerifiedEmail(profile: OAuthProfile): string {
  if (isKakaoProfile(profile)) {
    const email = extractKakaoEmail(profile);
    
    if (!email) {
      throw new Error('Kakao email consent required');
    }
    
    // Check if email is verified
    if (profile._json.kakao_account.is_email_verified) {
      return email;
    }
    
    throw new Error('Kakao email not verified');
  }
  
  if (isGoogleProfile(profile)) {
    const email = extractGoogleVerifiedEmail(profile);
    
    if (!email) {
      throw new Error('Google verified email required');
    }
    
    return email;
  }
  
  throw new Error('Unknown OAuth provider');
}
```

## Testing

See [__tests__/oauth-profiles.spec.ts](./__tests__/oauth-profiles.spec.ts) for comprehensive test examples.

```typescript
describe('Kakao Profile', () => {
  it('should extract email when consented', () => {
    const profile: KakaoOAuthProfile = {
      // ... mock profile data
    };
    
    const email = extractKakaoEmail(profile);
    expect(email).toBe('test@kakao.com');
  });
});
```

## Type Safety Benefits

1. **Compile-time safety**: TypeScript catches errors at compile time
2. **IntelliSense support**: Full autocomplete in IDEs
3. **Refactoring confidence**: Rename fields safely
4. **Self-documenting**: Types serve as documentation
5. **Runtime validation**: Type guards verify data shape

## Adding New Providers

To add a new OAuth provider (e.g., Facebook, GitHub):

1. Create `[provider]-profile.interface.ts` with complete types
2. Add type guard `is[Provider]Profile()`
3. Add extraction helpers `extract[Provider]Email()`, etc.
4. Add builder function `build[Provider]UserProfile()`
5. Update `OAuthProfile` union type
6. Add tests in `__tests__/`

## References

- [Kakao OAuth Documentation](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Documentation](http://www.passportjs.org/docs/)
