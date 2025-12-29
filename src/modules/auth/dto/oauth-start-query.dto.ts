import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * OAuth Start Query Parameters DTO
 * @description Query parameters for initiating OAuth flow
 */
export class OAuthStartQueryDto {
  /**
   * Application ID
   * @example 123
   */
  @ApiProperty({
    example: 1,
    description: 'Application ID for multi-tenant OAuth flow',
  })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  appId: number;

  /**
   * Redirect URI
   * @example "https://example.com/auth/callback"
   */
  @ApiProperty({
    example: 'https://example.com/auth/callback',
    description:
      'URL where user will be redirected after OAuth authentication. Must be in app whitelist.',
  })
  @IsUrl({ require_tld: false }) // Allow localhost for development
  @IsNotEmpty()
  redirect_uri: string;
}
