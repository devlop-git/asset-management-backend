import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AppService } from './app.service';
import { RolesGuard } from './common/guards/roles.guard';
import { Roles } from './common/decorators/roles.decorator';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ResponseType } from './common/types/response.type';

@Controller()
// @UseGuards(JwtAuthGuard,RolesGuard) //controller level authentication
export class AppController {
  constructor(private readonly appService: AppService) {}

  // @UseGuards(JwtAuthGuard,RolesGuard) //function level authentication
  // @Roles('admin','user')
  @Get()
  async getHello(): ResponseType<string> {
    try {
      let x = 1;
      if (x == 1) {
        const result = await this.appService.getHello();
        return { data: result, message: 'Success' };
      } else {
        throw new HttpException(
          'An error occurred during login',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      // You can customize the error handling as needed
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
