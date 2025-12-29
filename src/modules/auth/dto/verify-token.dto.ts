import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl, IsIn } from 'class-validator';

/**
 * Verify Token DTO
 * @description Unified DTO for verifying both magic link tokens and OAuth authorization codes
 */
export class VerifyTokenDto {
  /**
   * Token or authorization code to verify
   * @example "abc123def456"
   */
  @ApiProperty({
    example: 'abc123def456xyz789',
    description:
      'Token or authorization code. Can be magic link token or OAuth code.',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  /**
   * Redirect URI (required for OAuth flows)
   * @example "https://example.com/auth/callback"
   */
  @ApiProperty({
    example: 'https://example.com/auth/callback',
    description:
      'Redirect URI used during OAuth start. Must match stored value for OAuth flows.',
    required: false,
  })
  @IsUrl({ require_tld: false }, { message: 'redirect_uri must be a valid URL' })
  @IsOptional()
  redirect_uri?: string;

  /**
   * Provider type (optional, auto-detected if not provided)
   * @example "google"
   */
  @ApiProperty({
    example: 'google',
    description:
      "Provider type: 'magic-link', 'google', 'kakao'. Auto-detected if not provided.",
    required: false,
    enum: ['magic-link', 'google', 'kakao'],
  })
  @IsString()
  @IsIn(['magic-link', 'google', 'kakao'])
  @IsOptional()
  provider?: string;
}
