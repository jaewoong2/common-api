import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AdminRecoveryService } from "../services/admin-recovery.service";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { UserRole } from "@common/enums";

/**
 * Re-Enqueue Request DTO
 */
class ReEnqueueRequestDto {
  max_items?: number;
  older_than_seconds?: number;
}

/**
 * Admin Recovery Controller
 * @description Admin 전용 복구 API
 */
@ApiTags("Admin - Webhook Recovery")
@Controller("admin/recovery")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.APP_ADMIN, UserRole.PLATFORM_SUPER_ADMIN)
@ApiBearerAuth()
export class AdminRecoveryController {
  constructor(private readonly recoveryService: AdminRecoveryService) {}

  /**
   * POST /admin/recovery/re-enqueue
   * @description RECEIVED 상태인 요청들을 재큐잉
   */
  @Post("re-enqueue")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "RECEIVED 상태 요청 재큐잉" })
  @ApiResponse({ status: 200, description: "재큐잉 결과" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin required" })
  async reEnqueue(@Body() body: ReEnqueueRequestDto) {
    const result = await this.recoveryService.reEnqueueStaleRequests(
      body.max_items || 100,
      body.older_than_seconds || 60,
    );

    return {
      ok: true,
      data: result,
    };
  }
}
