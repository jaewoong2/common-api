import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Allows access when no roles are required or when user role matches metadata.
   */
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler()) || [];
    if (roles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const userRole = request?.user?.role;
    return roles.includes(userRole);
  }
}
