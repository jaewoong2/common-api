import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../../../database/entities/user.entity';
import { JsonObject } from '@common/types/json-value.type';

/**
 * DTO for user response data
 */
export class UserResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'ACTIVE', enum: ['ACTIVE', 'SUSPENDED', 'DELETED'] })
  status: string;

  @ApiProperty({ example: 'USER', enum: ['USER', 'APP_ADMIN', 'PLATFORM_SUPER_ADMIN'] })
  role: string;

  @ApiProperty({
    example: { displayName: 'John Doe', photo: 'https://example.com/photo.jpg' },
    nullable: true,
  })
  profile: JsonObject | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: string;

  /**
   * Transform UserEntity to UserResponseDto
   */
  static fromEntity(entity: UserEntity): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = entity.id;
    dto.email = entity.email;
    dto.status = entity.status;
    dto.role = entity.role;
    dto.profile = entity.profile;
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}
