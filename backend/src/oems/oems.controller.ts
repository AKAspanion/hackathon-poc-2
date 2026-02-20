import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { OemsService } from './oems.service';
import { RegisterOemDto } from './dto/register-oem.dto';
import { LoginOemDto } from './dto/login-oem.dto';

@Controller('oems')
export class OemsController {
  constructor(private readonly oemsService: OemsService) {}

  @Post('register')
  async register(@Body() dto: RegisterOemDto) {
    return this.oemsService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginOemDto) {
    return this.oemsService.login(dto.email);
  }
}
