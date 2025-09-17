import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Delete, 
  NotFoundException, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { RolePermissionsService } from './role_permissions.service';

@Controller('role-permissions')
export class RolePermissionsController {
  constructor(private readonly rolePermissionsService: RolePermissionsService) {}

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
