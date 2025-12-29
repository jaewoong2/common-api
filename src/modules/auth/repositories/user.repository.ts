import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../../database/entities/user.entity';
import { UserStatus } from '../../../common/enums';
import { JsonObject } from '@common/types/json-value.type';

/**
 * User Repository
 * @description Handles user data access operations
 */
@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Find user by email within an app
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
   * Create new user
   */
  async create(data: {
    appId: string;
    email: string;
    profile?: JsonObject;
  }): Promise<UserEntity> {
    const user = this.repo.create({
      ...data,
      email: data.email.toLowerCase(),
      status: UserStatus.ACTIVE,
    });
    return this.repo.save(user);
  }

  /**
   * Update user profile
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
   */
  async updateStatus(userId: string, status: UserStatus): Promise<void> {
    await this.repo.update(userId, { status });
  }

  /**
   * Soft delete user (set status to DELETED)
   */
  async softDelete(userId: string): Promise<void> {
    await this.repo.update(userId, { status: UserStatus.DELETED });
  }
}
