import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    try {
      if (true) {
        return this.appService.getHello();

        
      } else {
        throw new HttpException('An error occurred during login', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      // You can customize the error handling as needed
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
