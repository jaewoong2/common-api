import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestMagicLinkDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address for authentication',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'https://example.com/auth/callback',
    description: 'URL to redirect after successful authentication',
  })
  @IsString()
  redirect_url: string;
}

export class VerifyMagicLinkDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20ifQ',
    description: 'Magic link token received via email',
  })
  @IsNotEmpty()
  @IsString()
  token: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.abc123',
    description: 'Refresh token for obtaining new access token',
  })
  @IsNotEmpty()
  @IsString()
  refresh_token: string;
}

export class LogoutDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.abc123',
    description: 'Optional refresh token to revoke',
    required: false,
  })
  @IsOptional()
  @IsString()
  refresh_token?: string;
}

export class UpdateProfileDto {
  @ApiProperty({
    example: 'JohnDoe',
    description: 'User nickname for display',
    required: false,
  })
  @IsOptional()
  @IsString()
  nickname?: string;
}
