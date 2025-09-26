import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { Role } from './entities/role.entity';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ResponseType } from 'src/common/types/response.type';

@Controller('role')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin','admin')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  async create(@Body() createRoleDto: Partial<Role>): ResponseType<Role> {
    const result = await this.roleService.create(createRoleDto);
    return { data: result, message: 'Role created successfully' };
  }

  @Get()
  async findAll(): ResponseType<Role[]> {
    const result = await this.roleService.findAll();
    return { data: result, message: 'Roles fetched successfully' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): ResponseType<Role> {
    const role = await this.roleService.findOne(Number(id));
    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }
    return { data: role, message: 'Role fetched successfully' };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: Partial<Role>,
  ): ResponseType<Role> {
    const updatedRole = await this.roleService.update(Number(id), updateRoleDto);
    return { data: updatedRole, message: 'Role updated successfully' };
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.roleService.remove(Number(id));
    return { message: `Role deleted successfully` };
  }
}
