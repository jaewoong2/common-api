import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { UserRole } from "../enums/user-role.enum";

/**
 * Admin Guard
 * @description 관리자 권한 검증 가드 (APP_ADMIN 이상)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    // Check if user has admin role (APP_ADMIN or PLATFORM_SUPER_ADMIN)
    const adminRoles = [
      UserRole.APP_ADMIN,
      UserRole.PLATFORM_SUPER_ADMIN,
      "APP_ADMIN",
      "PLATFORM_SUPER_ADMIN",
      "admin",
    ];

    if (!adminRoles.includes(user.role)) {
      throw new ForbiddenException("Admin access required");
    }

    return true;
  }
}
