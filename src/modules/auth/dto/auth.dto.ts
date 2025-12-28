import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestMagicLinkDto {
  @IsEmail()
  email: string;

  @IsString()
  redirect_url: string;
}

export class VerifyMagicLinkDto {
  @IsNotEmpty()
  @IsString()
  token: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refresh_token: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  refresh_token?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  nickname?: string;
}
