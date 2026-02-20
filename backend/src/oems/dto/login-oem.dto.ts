import { IsEmail } from 'class-validator';

export class LoginOemDto {
  @IsEmail()
  email: string;
}
