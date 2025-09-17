import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginUserDto } from 'src/users/dto/users.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: CreateUserDto) {
    try {
      const { email, password, name } = body || {};
      const result = this.authService.register(name, email, password);
      return {data:result,message:"Successfully registered."}
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  //   @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Body() body: LoginUserDto) {
    try {
      const { email, password } = body;
      const result = await this.authService.login(email, password);
      return {data:result,message:"Successfully login."}
    } catch (error) {
      // You can customize the error handling as needed
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
