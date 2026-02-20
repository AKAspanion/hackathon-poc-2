import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Oem } from '../database/entities/oem.entity';

export const CurrentOem = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Oem => {
    const request = ctx.switchToHttp().getRequest<{ user: Oem }>();
    return request.user;
  },
);
