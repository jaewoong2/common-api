import { Public } from "../../common/decorators/public.decorator";
import { Controller, Get, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

/**
 * Health check controller for monitoring service availability
 */
@ApiTags("health")
@Controller("health")
@Public()
export class HealthController {
  /**
   * Basic health check endpoint
   * @returns Health status with timestamp
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Check service health status" })
  @ApiResponse({
    status: 200,
    description: "Service is healthy",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "ok" },
        timestamp: { type: "string", example: "2025-12-31T00:00:00.000Z" },
        uptime: { type: "number", example: 12345.67 },
      },
    },
  })
  check() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
