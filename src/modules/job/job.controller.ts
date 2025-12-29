import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CreateCallbackJobDto, RunJobsDto } from './dto/job.dto';
import { JobService } from './job.service';

@ApiTags('job')
@Controller()
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post('v1/jobs/callback-http')
  @HttpCode(HttpStatus.CREATED)
  createCallbackJob(
    @Headers('x-app-id') appId: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: CreateCallbackJobDto,
  ) {
    return this.jobService.createCallbackJob(appId, {
      method: body.method,
      path: body.path,
      body: body.body,
      headers: {},
      expectedStatuses: body.expected_statuses,
    }, idempotencyKey);
  }

  @Post('internal/v1/jobs/run')
  runDueJobs(@Body() body: RunJobsDto) {
    return this.jobService.runDueJobs(body.limit || 100);
  }
}
