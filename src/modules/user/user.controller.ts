import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AppRequest } from '@common/interfaces/app-request.interface';
import { UserRole } from '@common/enums';

/**
 * User Controller
 * @description Handles user CRUD endpoints
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller('v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * List all users in the app
   */
  @Get()
  @Roles(UserRole.APP_ADMIN)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'List of all users',
    type: [UserResponseDto],
  })
  async findAll(@Req() req: AppRequest): Promise<UserResponseDto[]> {
    const appId = req.appId ?? 'default';
    return this.userService.findAll(appId);
  }

  /**
   * Get user by ID
   */
  @Get(':id')
  @Roles(UserRole.APP_ADMIN, UserRole.USER)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.findOne(id);
  }

  /**
   * Create new user
   */
  @Post()
  @Roles(UserRole.APP_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @Body() dto: CreateUserDto,
    @Req() req: AppRequest,
  ): Promise<UserResponseDto> {
    const appId = req.appId ?? 'default';
    return this.userService.create(appId, dto);
  }

  /**
   * Update user
   */
  @Patch(':id')
  @Roles(UserRole.APP_ADMIN)
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.userService.update(id, dto);
  }

  /**
   * Soft delete user
   */
  @Delete(':id')
  @Roles(UserRole.APP_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.userService.remove(id);
  }
}
