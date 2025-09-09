import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  async register(
    @Body() body: { name?: string; email?: string; password?: string },
  ) {
    const { email, password, name } = body || {};
    return this.authService.register(name, email, password);
  }

  //   @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Body() body: any) {
    const { email,password} = body
    return this.authService.login(email, password);
  }
}
