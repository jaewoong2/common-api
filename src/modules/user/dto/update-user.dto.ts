import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';
import { JsonObject } from '@common/types/json-value.type';

/**
 * DTO for updating an existing user
 */
export class UpdateUserDto {
  @ApiProperty({
    example: { displayName: 'Jane Doe', photo: 'https://example.com/new-photo.jpg' },
    description: 'User profile data (JSONB)',
    required: false,
  })
  @IsOptional()
  @IsObject()
  profile?: JsonObject;

  @ApiProperty({
    example: 'ACTIVE',
    enum: UserStatus,
    description: 'User status',
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({
    example: 'APP_ADMIN',
    enum: UserRole,
    description: 'User role',
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
