import { Module } from '@nestjs/common';
import { RolePermissionsService } from './role_permissions.service';
import { RolePermissionsController } from './role_permissions.controller';

@Module({
  providers: [RolePermissionsService],
  controllers: [RolePermissionsController]
})
export class RolePermissionsModule {}
