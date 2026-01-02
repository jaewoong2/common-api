import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import { CreateCallbackJobDto, RunJobsDto } from "./dto/job.dto";
import { CreateUnifiedJobDto } from "./dto/create-job.dto";
import { UnifiedJobMessageDto } from "./dto/unified-job-message.dto";
import { JobService } from "./job.service";
import { MultiQueuePollingService } from "./services/multi-queue-polling.service";

@ApiTags("job")
@ApiBearerAuth()
@Controller()
export class JobController {
  constructor(
    private readonly jobService: JobService,
    private readonly multiQueuePollingService: MultiQueuePollingService
  ) {}

  // ========== Legacy Endpoints (Backward Compatibility) ==========

  @Post("v1/jobs/callback-http")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "[Legacy] Create HTTP callback job" })
  createCallbackJob(
    @Headers("x-app-id") appId: string,
    @Headers("idempotency-key") idempotencyKey: string,
    @Body() body: CreateCallbackJobDto
  ) {
    return this.jobService.createCallbackJob(
      appId,
      {
        method: body.method,
        path: body.path,
        body: body.body,
        headers: {},
        expectedStatuses: body.expected_statuses,
      },
      idempotencyKey
    );
  }

  @Post("internal/v1/jobs/run")
  @ApiOperation({ summary: "[Legacy] Run due jobs from database" })
  runDueJobs(@Body() body: RunJobsDto) {
    return this.jobService.runDueJobs(body.limit || 100);
  }

  // ========== Unified Job System Endpoints ==========

  @Post("v1/jobs/create")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create unified job (supports SQS, DB, or both)" })
  @ApiResponse({ status: 201, description: "Job created successfully" })
  @ApiResponse({ status: 400, description: "Invalid request body" })
  async createUnifiedJob(@Body() dto: CreateUnifiedJobDto) {
    return this.jobService.createUnifiedJob(dto);
  }

  @Post("internal/v1/poll-sqs")
  @ApiOperation({
    summary: "Poll SQS and process messages (called by EventBridge cron)",
  })
  @ApiResponse({ status: 200, description: "Messages processed successfully" })
  async pollSqs(@Body() body?: { limit?: number }) {
    const processed = await this.jobService.pollAndProcessSqs(
      body?.limit || 10
    );
    return { processed };
  }

  @Post("internal/v1/run-db-jobs")
  @ApiOperation({ summary: "Run due DB jobs (called by EventBridge cron)" })
  @ApiResponse({ status: 200, description: "Jobs processed successfully" })
  async runDbJobs(@Body() body?: { limit?: number }) {
    const processed = await this.jobService.runDueDbJobs(body?.limit || 100);
    return { processed };
  }

  @Post("internal/v1/process-scheduled-message")
  @ApiOperation({
    summary: "Process scheduled message (called by EventBridge Schedule)",
  })
  @ApiResponse({
    status: 200,
    description: "Scheduled message processed successfully",
  })
  async processScheduledMessage(@Body() message: UnifiedJobMessageDto) {
    await this.jobService.processScheduledMessage(message);
    return { success: true };
  }

  @Post("internal/v1/poll-source-queue")
  @ApiOperation({
    summary: "Poll source queue and forward to main queue",
    description: "Called by EventBridge scheduler for crypto.fifo and ox.fifo",
  })
  @ApiResponse({
    status: 200,
    description: "Messages processed successfully",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        queueName: { type: "string", enum: ["crypto", "ox"] },
        limit: { type: "number" },
      },
    },
  })
  async pollSourceQueue(
    @Body() body: { queueName: "crypto" | "ox"; limit?: number }
  ) {
    const processed = await this.multiQueuePollingService.pollQueue(
      body.queueName,
      body.limit
    );
    return {
      queueName: body.queueName,
      processed,
      timestamp: new Date().toISOString(),
    };
  }
}
