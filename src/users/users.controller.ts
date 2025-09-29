import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  NotFoundException,
  UseGuards,
  Put,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/users.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ResponseType } from 'src/common/types/response.type';
import { createUserWithRoleDto } from './dto/users.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin','superadmin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() body: createUserWithRoleDto): ResponseType<User> {
     await this.usersService.create(
      body.name,
      body.email,
      body.password,
      body.role,
    );
    return { data: null, message: 'User created successfully' };
  }

  @Get()
  async findAll(): ResponseType<User[]> {
    const users = await this.usersService.findAll();
    return { data: users, message: 'Users fetched successfully' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): ResponseType<User> {
    const user = await this.usersService.findById(Number(id));
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return { data: user, message: 'User fetched successfully' };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: Partial<User>,
  ): ResponseType<User> {
    const updatedUser = await this.usersService.update(
      Number(id),
      updateUserDto,
    );
    return { data: updatedUser, message: 'User updated successfully' };
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.usersService.remove(Number(id));
    return { message: `User deleted successfully` };
  }
}
