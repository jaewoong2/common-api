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
  UseGuards,
} from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import {
  AdjustWalletDto,
  ListJobsQueryDto,
} from "./dto/admin.dto";
import { AdminService } from "./admin.service";

@UseGuards(RolesGuard)
@Controller("v1/admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post("users/:userId/suspend")
  @Roles("APP_ADMIN")
  @HttpCode(HttpStatus.OK)
  suspendUser(@Param("userId") userId: string) {
    return this.adminService.suspendUser(userId);
  }

  @Post("users/:userId/unsuspend")
  @Roles("APP_ADMIN")
  @HttpCode(HttpStatus.OK)
  unsuspendUser(@Param("userId") userId: string) {
    return this.adminService.unsuspendUser(userId);
  }

  @Post("wallet/adjust")
  @Roles("APP_ADMIN")
  @HttpCode(HttpStatus.OK)
  adjustWallet(
    @Headers("x-app-id") appId: string,
    @Body() body: AdjustWalletDto,
  ) {
    return this.adminService.adjustWallet(
      appId,
      body.user_id,
      body.delta.toString(),
      body.reason,
      body.ref_id,
    );
  }

  @Post("jobs/:jobId/retry")
  @Roles("APP_ADMIN")
  retryJob(@Param("jobId") jobId: string) {
    return this.adminService.retryJob(jobId);
  }

  @Post("jobs/:jobId/deadletter")
  @Roles("APP_ADMIN")
  deadletterJob(@Param("jobId") jobId: string) {
    return this.adminService.deadletterJob(jobId);
  }

  @Get("jobs")
  @Roles("APP_ADMIN")
  listJobs(
    @Headers("x-app-id") appId: string,
    @Query() query: ListJobsQueryDto,
  ) {
    return this.adminService.listJobs(appId, {
      status: query.status as any,
      limit: query.limit,
      offset: 0,
    });
  }
}
