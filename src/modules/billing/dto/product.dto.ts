import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { JsonObject } from '@common/types/json-value.type';

export class CreateProductDto {
  @ApiProperty({
    example: 'DIGITAL',
    description: 'Product type',
    enum: ['DIGITAL', 'SUBSCRIPTION', 'PHYSICAL'],
  })
  @IsIn(['DIGITAL', 'SUBSCRIPTION', 'PHYSICAL'])
  type: string;

  @ApiProperty({
    example: 'Premium Subscription',
    description: 'Product name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '1000',
    description: 'Default price in cents',
  })
  @IsString()
  @IsNotEmpty()
  default_price: string;

  @ApiProperty({
    example: { features: ['feature1', 'feature2'], category: 'software' },
    description: 'Additional product metadata',
    type: 'object',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: JsonObject;

  @ApiProperty({
    example: true,
    description: 'Whether the product is active',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateProductDto {
  @ApiProperty({
    example: 'Premium Subscription Plus',
    description: 'Updated product name',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: true,
    description: 'Whether the product is active',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    example: { features: ['feature1', 'feature2', 'feature3'], category: 'software' },
    description: 'Additional product metadata',
    type: 'object',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: JsonObject;
}
