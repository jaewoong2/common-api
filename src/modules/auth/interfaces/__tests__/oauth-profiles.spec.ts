/**
 * OAuth Profile Type Tests
 * @description Tests to verify type safety and helper functions
 */

import {
  isKakaoProfile,
  extractKakaoEmail,
  extractKakaoNickname,
  extractKakaoProfileImage,
  extractKakaoThumbnail,
  buildKakaoUserProfile,
  KakaoOAuthProfile,
} from '../kakao-profile.interface';
import {
  isGoogleProfile,
  extractGoogleEmail,
  extractGoogleVerifiedEmail,
  extractGoogleDisplayName,
  extractGooglePhoto,
  buildGoogleUserProfile,
  GoogleOAuthProfile,
} from '../google-profile.interface';

describe('Kakao OAuth Profile', () => {
  const mockKakaoProfile: KakaoOAuthProfile = {
    provider: 'kakao',
    id: 3914018050,
    username: '임재웅',
    displayName: '임재웅',
    _raw: '{"id":3914018050,"connected_at":"2025-12-29T06:00:21Z","properties":{"nickname":"임재웅","profile_image":"http://k.kakaocdn.net/dn/bFbT13/dJMcajt09wp/90ynFbKpON5La84MuT5sa0/img_640x640.jpg","thumbnail_image":"http://k.kakaocdn.net/dn/bFbT13/dJMcajt09wp/90ynFbKpON5La84MuT5sa0/img_110x110.jpg"},"kakao_account":{"profile_nickname_needs_agreement":false,"profile_image_needs_agreement":false,"profile":{"nickname":"임재웅","thumbnail_image_url":"http://k.kakaocdn.net/dn/bFbT13/dJMcajt09wp/90ynFbKpON5La84MuT5sa0/img_110x110.jpg","profile_image_url":"http://k.kakaocdn.net/dn/bFbT13/dJMcajt09wp/90ynFbKpON5La84MuT5sa0/img_640x640.jpg","is_default_image":false,"is_default_nickname":false}}}',
    _json: {
      id: 3914018050,
      connected_at: '2025-12-29T06:00:21Z',
      properties: {
        nickname: '임재웅',
        profile_image: 'http://k.kakaocdn.net/dn/bFbT13/dJMcajt09wp/90ynFbKpON5La84MuT5sa0/img_640x640.jpg',
        thumbnail_image: 'http://k.kakaocdn.net/dn/bFbT13/dJMcajt09wp/90ynFbKpON5La84MuT5sa0/img_110x110.jpg',
      },
      kakao_account: {
        profile_nickname_needs_agreement: false,
        profile_image_needs_agreement: false,
        profile: {
          nickname: '임재웅',
          thumbnail_image_url: 'http://k.kakaocdn.net/dn/bFbT13/dJMcajt09wp/90ynFbKpON5La84MuT5sa0/img_110x110.jpg',
          profile_image_url: 'http://k.kakaocdn.net/dn/bFbT13/dJMcajt09wp/90ynFbKpON5La84MuT5sa0/img_640x640.jpg',
          is_default_image: false,
          is_default_nickname: false,
        },
      },
    },
  };

  const mockKakaoProfileWithEmail: KakaoOAuthProfile = {
    ...mockKakaoProfile,
    _json: {
      ...mockKakaoProfile._json,
      kakao_account: {
        ...mockKakaoProfile._json.kakao_account,
        email: 'test@kakao.com',
      },
    },
  };

  describe('Type Guards', () => {
    it('should identify Kakao profile', () => {
      expect(isKakaoProfile(mockKakaoProfile)).toBe(true);
    });

    it('should reject non-Kakao profile', () => {
      expect(isKakaoProfile({ provider: 'google' })).toBe(false);
    });
  });

  describe('Email Extraction', () => {
    it('should extract email when available', () => {
      const email = extractKakaoEmail(mockKakaoProfileWithEmail);
      expect(email).toBe('test@kakao.com');
    });

    it('should return undefined when email not consented', () => {
      const email = extractKakaoEmail(mockKakaoProfile);
      expect(email).toBeUndefined();
    });
  });

  describe('Nickname Extraction', () => {
    it('should extract nickname from profile', () => {
      const nickname = extractKakaoNickname(mockKakaoProfile);
      expect(nickname).toBe('임재웅');
    });

    it('should fallback to displayName', () => {
      const profileWithoutNickname: KakaoOAuthProfile = {
        ...mockKakaoProfile,
        _json: {
          ...mockKakaoProfile._json,
          properties: {
            ...mockKakaoProfile._json.properties,
            nickname: undefined as any,
          },
          kakao_account: {
            ...mockKakaoProfile._json.kakao_account,
            profile: {
              ...mockKakaoProfile._json.kakao_account.profile,
              nickname: undefined as any,
            },
          },
        },
      };
      
      const nickname = extractKakaoNickname(profileWithoutNickname);
      expect(nickname).toBe('임재웅');
    });
  });

  describe('Image Extraction', () => {
    it('should extract profile image', () => {
      const image = extractKakaoProfileImage(mockKakaoProfile);
      expect(image).toBe('http://k.kakaocdn.net/dn/bFbT13/dJMcajt09wp/90ynFbKpON5La84MuT5sa0/img_640x640.jpg');
    });

    it('should extract thumbnail image', () => {
      const thumbnail = extractKakaoThumbnail(mockKakaoProfile);
      expect(thumbnail).toBe('http://k.kakaocdn.net/dn/bFbT13/dJMcajt09wp/90ynFbKpON5La84MuT5sa0/img_110x110.jpg');
    });
  });

  describe('Profile Builder', () => {
    it('should build complete user profile', () => {
      const profile = buildKakaoUserProfile(mockKakaoProfileWithEmail);
      
      expect(profile).toEqual({
        displayName: '임재웅',
        photo: 'http://k.kakaocdn.net/dn/bFbT13/dJMcajt09wp/90ynFbKpON5La84MuT5sa0/img_640x640.jpg',
        email: 'test@kakao.com',
        thumbnail: 'http://k.kakaocdn.net/dn/bFbT13/dJMcajt09wp/90ynFbKpON5La84MuT5sa0/img_110x110.jpg',
        isDefaultImage: false,
        isDefaultNickname: false,
      });
    });
  });
});

describe('Google OAuth Profile', () => {
  const mockGoogleProfile: GoogleOAuthProfile = {
    provider: 'google',
    id: '1234567890',
    displayName: 'John Doe',
    name: {
      givenName: 'John',
      familyName: 'Doe',
    },
    emails: [
      {
        value: 'john@gmail.com',
        verified: true,
      },
    ],
    photos: [
      {
        value: 'https://lh3.googleusercontent.com/a/default-user',
      },
    ],
    _raw: '{"sub":"1234567890","name":"John Doe","given_name":"John","family_name":"Doe","picture":"https://lh3.googleusercontent.com/a/default-user","email":"john@gmail.com","email_verified":true,"locale":"en"}',
    _json: {
      sub: '1234567890',
      name: 'John Doe',
      given_name: 'John',
      family_name: 'Doe',
      picture: 'https://lh3.googleusercontent.com/a/default-user',
      email: 'john@gmail.com',
      email_verified: true,
      locale: 'en',
    },
  };

  describe('Type Guards', () => {
    it('should identify Google profile', () => {
      expect(isGoogleProfile(mockGoogleProfile)).toBe(true);
    });

    it('should reject non-Google profile', () => {
      expect(isGoogleProfile({ provider: 'kakao' })).toBe(false);
    });
  });

  describe('Email Extraction', () => {
    it('should extract email from emails array', () => {
      const email = extractGoogleEmail(mockGoogleProfile);
      expect(email).toBe('john@gmail.com');
    });

    it('should extract email from _json', () => {
      const profileWithoutEmailsArray: GoogleOAuthProfile = {
        ...mockGoogleProfile,
        emails: undefined,
      };
      
      const email = extractGoogleEmail(profileWithoutEmailsArray);
      expect(email).toBe('john@gmail.com');
    });

    it('should extract verified email only', () => {
      const email = extractGoogleVerifiedEmail(mockGoogleProfile);
      expect(email).toBe('john@gmail.com');
    });

    it('should return undefined for unverified email', () => {
      const unverifiedProfile: GoogleOAuthProfile = {
        ...mockGoogleProfile,
        emails: [{ value: 'unverified@gmail.com', verified: false }],
        _json: {
          ...mockGoogleProfile._json,
          email_verified: false,
        },
      };
      
      const email = extractGoogleVerifiedEmail(unverifiedProfile);
      expect(email).toBeUndefined();
    });
  });

  describe('Display Name Extraction', () => {
    it('should extract display name', () => {
      const displayName = extractGoogleDisplayName(mockGoogleProfile);
      expect(displayName).toBe('John Doe');
    });

    it('should fallback to combined name', () => {
      const profileWithoutDisplayName: GoogleOAuthProfile = {
        ...mockGoogleProfile,
        displayName: undefined as any,
        _json: {
          ...mockGoogleProfile._json,
          name: undefined,
        },
      };
      
      const displayName = extractGoogleDisplayName(profileWithoutDisplayName);
      expect(displayName).toBe('John Doe');
    });
  });

  describe('Photo Extraction', () => {
    it('should extract photo from photos array', () => {
      const photo = extractGooglePhoto(mockGoogleProfile);
      expect(photo).toBe('https://lh3.googleusercontent.com/a/default-user');
    });

    it('should extract photo from _json', () => {
      const profileWithoutPhotosArray: GoogleOAuthProfile = {
        ...mockGoogleProfile,
        photos: undefined,
      };
      
      const photo = extractGooglePhoto(profileWithoutPhotosArray);
      expect(photo).toBe('https://lh3.googleusercontent.com/a/default-user');
    });
  });

  describe('Profile Builder', () => {
    it('should build complete user profile', () => {
      const profile = buildGoogleUserProfile(mockGoogleProfile);
      
      expect(profile).toEqual({
        displayName: 'John Doe',
        photo: 'https://lh3.googleusercontent.com/a/default-user',
        email: 'john@gmail.com',
        emailVerified: true,
        givenName: 'John',
        familyName: 'Doe',
        locale: 'en',
      });
    });
  });
});
