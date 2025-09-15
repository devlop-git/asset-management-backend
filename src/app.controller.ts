import { Controller, Get, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './common/guards/roles.guard';
import { Roles } from './common/decorators/roles.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // @UseGuards(AuthGuard('jwt'),RolesGuard)
  // @Roles('admin','user')
  @Get()
  getHello(): string {
    try {
      if(true){
        return this.appService.getHello();
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
