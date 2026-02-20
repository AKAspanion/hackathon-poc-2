import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

/** Public routes: no token required (path is checked without query string) */
const PUBLIC_ROUTES: { method: string; pathPrefix: string }[] = [
  { method: 'POST', pathPrefix: '/oems/register' },
  { method: 'POST', pathPrefix: '/oems/login' },
];

function isPublicRoute(req: Request): boolean {
  const path = (req.originalUrl || req.url || '').split('?')[0];
  const method = (req.method || '').toUpperCase();
  return PUBLIC_ROUTES.some(
    (r) => r.method === method && path.startsWith(r.pathPrefix),
  );
}

@Injectable()
export class GlobalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (isPublicRoute(request)) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: Error | null, user: TUser | false): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or missing token');
    }
    return user;
  }
}
