import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { OemsService } from './oems.service';
import { Oem } from '../database/entities/oem.entity';
import { JwtPayload } from './oems.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private oemsService: OemsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'dev-secret-change-in-production',
    });
  }

  async validate(payload: JwtPayload): Promise<Oem> {
    const oem = await this.oemsService.findById(payload.sub);
    if (!oem) {
      throw new UnauthorizedException('OEM not found');
    }
    return oem;
  }
}
