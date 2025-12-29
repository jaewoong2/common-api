import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsObject, IsOptional } from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JsonObject } from '@common/types/json-value.type';

/**
 * DTO for creating a new user
 */
export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: { displayName: 'John Doe', photo: 'https://example.com/photo.jpg' },
    description: 'User profile data (JSONB)',
    required: false,
  })
  @IsOptional()
  @IsObject()
  profile?: JsonObject;

  @ApiProperty({
    example: 'USER',
    enum: UserRole,
    description: 'User role',
    required: false,
    default: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
