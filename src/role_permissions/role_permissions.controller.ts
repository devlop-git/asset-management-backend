import { 
  Controller, 
  Get, 
  Post, 
  Put,
  Body, 
  Param, 
  Delete, 
  NotFoundException,
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { RolePermissionsService } from './role_permissions.service';
import { InjectRepository } from '@nestjs/typeorm';
import { RolePermission } from './entities/role_permissions.entity';
import { Repository } from 'typeorm/repository/Repository';

@Controller('role-permissions')
export class RolePermissionsController {
  constructor(private readonly rolePermissionsService: RolePermissionsService, 
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  @Post()
  async assignPermissionToRole(
    @Body() data: { roleId: number; permissionId: number }
  ) {
    try {
      const rolePermission = await this.rolePermissionsService.assignPermissionToRole(
        data.roleId,
        data.permissionId
      );
      return { data: rolePermission, message: 'Permission assigned to role successfully' };
    } catch (error) {
      throw new HttpException(error.message || 'Failed to assign permission to role', HttpStatus.BAD_REQUEST);
    }
  }

  @Put('/:id')
  async modifyPermissionToRole(
    @Param('id') id: string,
    @Body() data: { roleId: number; permissionId: number }
  ) {
    try {
      const rolePermission = await this.rolePermissionRepository.findOne({
        where: { id: Number(id) }
      });
      
      if (!rolePermission) {
        throw new NotFoundException('Role permission not found');
      }

      await this.rolePermissionRepository.update(Number(id), {
        role: { id: data.roleId },
        permission: { id: data.permissionId }
      });

      const updatedRolePermission = await this.rolePermissionRepository.findOne({
        where: { id: Number(id) }
      });

      return { 
        data: updatedRolePermission, 
        message: 'Permission updated successfully' 
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update permission', 
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get()
  async findAll() {
    const rolePermissions = await this.rolePermissionsService.findAll();
    return { data: rolePermissions, message: 'Role permissions fetched successfully' };
  }

  @Get('role/:roleId')
  async findByRole(@Param('roleId') roleId: string) {
    try {
      const rolePermissions = await this.rolePermissionsService.findByRole(Number(roleId));
      return { data: rolePermissions, message: 'Role permissions for role fetched successfully' };
    } catch (error) {
      throw new NotFoundException(error.message || 'Role permissions not found');
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.rolePermissionsService.remove(Number(id));
      return { message: 'Role permission deleted successfully' };
    } catch (error) {
      throw new NotFoundException(error.message || 'Role permission not found');
    }
  }
}
