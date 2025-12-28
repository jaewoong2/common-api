import { ArrayMinSize, IsArray, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';

export class CreateAppDto {
  @IsString()
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  hosts: string[];

  @IsUrl()
  callback_base_url: string;

  @IsArray()
  @IsString({ each: true })
  callback_allowlist_paths: string[];
}

export class UpdateAppDto {
  @IsOptional()
  @IsUrl()
  callback_base_url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  callback_allowlist_paths?: string[];

  @IsOptional()
  @IsString()
  callback_secret_ref?: string;
}
