import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

/**
 * User Service
 * @description Handles user business logic and CRUD operations
 */
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Get all users in an app
   * @param appId App UUID
   * @returns Array of UserResponseDto
   */
  async findAll(appId: string): Promise<UserResponseDto[]> {
    return this.userRepository.findAllByApp(appId);
  }

  /**
   * Get user by ID
   * @param userId User UUID
   * @returns UserResponseDto
   * @throws NotFoundException if user not found
   */
  async findOne(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findByIdWithDto(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return user;
  }

  /**
   * Create new user
   * @param appId App UUID
   * @param dto CreateUserDto
   * @returns UserResponseDto
   */
  async create(appId: string, dto: CreateUserDto): Promise<UserResponseDto> {
    const entity = await this.userRepository.create({
      appId,
      email: dto.email,
      profile: dto.profile,
      role: dto.role,
    });

    return UserResponseDto.fromEntity(entity);
  }

  /**
   * Update user
   * @param userId User UUID
   * @param dto UpdateUserDto
   * @returns UserResponseDto
   * @throws NotFoundException if user not found
   */
  async update(userId: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    // Check if user exists
    const existing = await this.userRepository.findById(userId);
    if (!existing) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.userRepository.update(userId, dto);
  }

  /**
   * Soft delete user (set status to DELETED)
   * @param userId User UUID
   * @throws NotFoundException if user not found
   */
  async remove(userId: string): Promise<void> {
    // Check if user exists
    const existing = await this.userRepository.findById(userId);
    if (!existing) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    await this.userRepository.softDelete(userId);
  }
}
