import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { AdjustWalletDto, ListJobsQueryDto } from "./dto/admin.dto";
import { AdminService } from "./admin.service";
import { UserRole } from "@common/enums";

@ApiTags("admin")
@ApiBearerAuth()
@Controller("v1/admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post("users/:userId/suspend")
  @Roles(UserRole.APP_ADMIN)
  @HttpCode(HttpStatus.OK)
  suspendUser(@Param("userId") userId: string) {
    return this.adminService.suspendUser(userId);
  }

  @Post("users/:userId/unsuspend")
  @Roles(UserRole.APP_ADMIN)
  @HttpCode(HttpStatus.OK)
  unsuspendUser(@Param("userId") userId: string) {
    return this.adminService.unsuspendUser(userId);
  }

  @Post("wallet/adjust")
  @Roles(UserRole.APP_ADMIN)
  @HttpCode(HttpStatus.OK)
  adjustWallet(
    @Headers("x-app-id") appId: string,
    @Body() body: AdjustWalletDto
  ) {
    return this.adminService.adjustWallet(
      appId,
      body.user_id,
      body.delta.toString(),
      body.reason,
      body.ref_id
    );
  }

  @Post("jobs/:jobId/retry")
  @Roles(UserRole.APP_ADMIN)
  retryJob(@Param("jobId") jobId: string) {
    return this.adminService.retryJob(jobId);
  }

  @Post("jobs/:jobId/deadletter")
  @Roles(UserRole.APP_ADMIN)
  deadletterJob(@Param("jobId") jobId: string) {
    return this.adminService.deadletterJob(jobId);
  }

  @Get("jobs")
  @Roles(UserRole.APP_ADMIN)
  listJobs(
    @Headers("x-app-id") appId: string,
    @Query() query: ListJobsQueryDto
  ) {
    return this.adminService.listJobs(appId, {
      status: query.status,
      limit: query.limit,
      offset: 0,
    });
  }
}
