import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';

export class CreateAppDto {
  @ApiProperty({
    example: 'My Application',
    description: 'Application name',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: ['app.example.com', 'api.example.com'],
    description: 'List of allowed hosts (minimum 1)',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  hosts: string[];

  @ApiProperty({
    example: 'https://api.example.com/webhooks',
    description: 'Base URL for callback endpoints',
  })
  @IsUrl()
  callback_base_url: string;

  @ApiProperty({
    example: ['/payment/success', '/payment/failed', '/order/completed'],
    description: 'List of allowed callback paths',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  callback_allowlist_paths: string[];
}

export class UpdateAppDto {
  @ApiProperty({
    example: 'https://api.example.com/webhooks',
    description: 'Base URL for callback endpoints',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  callback_base_url?: string;

  @ApiProperty({
    example: ['/payment/success', '/payment/failed', '/order/completed', '/subscription/updated'],
    description: 'List of allowed callback paths',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  callback_allowlist_paths?: string[];

  @ApiProperty({
    example: 'secret_ref_abc123',
    description: 'Reference to callback secret for signing',
    required: false,
  })
  @IsOptional()
  @IsString()
  callback_secret_ref?: string;
}
