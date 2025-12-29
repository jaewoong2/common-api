import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../../database/entities/user.entity';
import { UserStatus, UserRole } from '../../../common/enums';
import { UserResponseDto } from '../dto/user-response.dto';
import { JsonObject } from '@common/types/json-value.type';

/**
 * User Repository
 * @description Handles user data access operations with DTO transformations
 */
@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  /**
   * Find user by ID (returns entity)
   * @param id User UUID
   * @returns UserEntity or null
   */
  async findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Find user by ID with DTO transformation
   * @param id User UUID
   * @returns UserResponseDto or null
   */
  async findByIdWithDto(id: string): Promise<UserResponseDto | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? UserResponseDto.fromEntity(entity) : null;
  }

  /**
   * Find user by email within an app
   * @param appId App UUID
   * @param email User email
   * @returns UserEntity or null
   */
  async findByEmail(appId: string, email: string): Promise<UserEntity | null> {
    return this.repo.findOne({
      where: {
        appId,
        email: email.toLowerCase(),
      },
    });
  }

  /**
   * Find all users in an app with DTO transformation
   * @param appId App UUID
   * @returns Array of UserResponseDto
   */
  async findAllByApp(appId: string): Promise<UserResponseDto[]> {
    const entities = await this.repo.find({
      where: { appId },
      order: { createdAt: 'DESC' },
    });
    return entities.map((entity) => UserResponseDto.fromEntity(entity));
  }

  /**
   * Create new user
   * @param data User creation data
   * @returns UserEntity
   */
  async create(data: {
    appId: string;
    email: string;
    profile?: JsonObject;
    role?: UserRole;
  }): Promise<UserEntity> {
    const user = this.repo.create({
      appId: data.appId,
      email: data.email.toLowerCase(),
      profile: data.profile,
      status: UserStatus.ACTIVE,
      role: data.role || UserRole.USER,
    });
    return this.repo.save(user);
  }

  /**
   * Update user with partial data and return DTO
   * @param userId User UUID
   * @param data Partial user data
   * @returns UserResponseDto
   */
  async update(
    userId: string,
    data: Partial<{ profile: JsonObject; status: UserStatus; role: UserRole }>,
  ): Promise<UserResponseDto> {
    await this.repo.update(userId, data);
    const updated = await this.findById(userId);
    if (!updated) {
      throw new Error('User not found after update');
    }
    return UserResponseDto.fromEntity(updated);
  }

  /**
   * Update user profile
   * @param userId User UUID
   * @param profile Profile data
   * @returns UserEntity
   */
  async updateProfile(
    userId: string,
    profile: JsonObject,
  ): Promise<UserEntity> {
    await this.repo.update(userId, { profile });
    return this.findById(userId);
  }

  /**
   * Update user status
   * @param userId User UUID
   * @param status User status
   */
  async updateStatus(userId: string, status: UserStatus): Promise<void> {
    await this.repo.update(userId, { status });
  }

  /**
   * Soft delete user (set status to DELETED)
   * @param userId User UUID
   */
  async softDelete(userId: string): Promise<void> {
    await this.repo.update(userId, { status: UserStatus.DELETED });
  }
}
