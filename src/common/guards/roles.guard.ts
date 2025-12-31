import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@common/enums';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Allows access when no roles are required or when user role matches metadata.
   */
  canActivate(context: ExecutionContext): boolean {
    const roles =
      this.reflector.getAllAndOverride<UserRole[]>('roles', [
        context.getHandler(),
        context.getClass(),
      ]) || [];
    if (roles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const userRole = request?.user?.role;
    return roles.includes(userRole);
  }
}
