import { Controller, Get, Post, Body, Param, Patch, Delete, NotFoundException, UseGuards } from '@nestjs/common';
import { RoleService } from './role.service';
import { Role } from './entities/role.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @UseGuards(AuthGuard('jwt'))  
  @Post()
  async create(@Body() createRoleDto: Partial<Role>): Promise<Role> {
    return this.roleService.create(createRoleDto);
  }

  @UseGuards(AuthGuard('jwt'))  
  @Get()
  async findAll(): Promise<Role[]> {
    return this.roleService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))  
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Role> {
    const role = await this.roleService.findOne(Number(id));
    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }
    return role;
  }

  @UseGuards(AuthGuard('jwt'))  
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: Partial<Role>,
  ): Promise<Role> {
    return this.roleService.update(Number(id), updateRoleDto);
  }

  @UseGuards(AuthGuard('jwt'))  
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.roleService.remove(Number(id));
    return { message: `Role with id ${id} deleted successfully` };
  }
}
