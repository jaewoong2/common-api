import { applyDecorators, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";

/**
 * Declares that a route requires JWT authentication and documents it in Swagger.
 */
export const Auth = () =>
  applyDecorators(ApiBearerAuth(), UseGuards(JwtAuthGuard));
