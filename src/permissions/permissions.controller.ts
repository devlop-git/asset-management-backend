import { Controller, Get, Post, Body, Param, Put, Delete, NotFoundException, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { Permission } from './entities/permissions.entity';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin','admin')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  async create(@Body() data: Partial<Permission>) {
    try {
      const permission = await this.permissionsService.create(data);
      return { data: permission, message: 'Permission created successfully' };
    } catch (error) {
      throw new HttpException(error.message || 'Failed to create permission', HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  async findAll() {
    const permissions = await this.permissionsService.findAll();
    return { data: permissions, message: 'Permissions fetched successfully' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const permission = await this.permissionsService.findOne(Number(id));
      return { data: permission, message: 'Permission fetched successfully' };
    } catch (error) {
      throw new NotFoundException(error.message || 'Permission not found');
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: Partial<Permission>) {
    try {
      const permission = await this.permissionsService.update(Number(id), data);
      return { data: permission, message: 'Permission updated successfully' };
    } catch (error) {
      throw new HttpException(error.message || 'Failed to update permission', HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.permissionsService.remove(Number(id));
      return { message: 'Permission deleted successfully' };
    } catch (error) {
      throw new NotFoundException(error.message || 'Permission not found');
    }
  }
}
