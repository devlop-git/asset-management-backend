import { Module } from '@nestjs/common';
import { RolePermissionsService } from './role_permissions.service';
import { RolePermissionsController } from './role_permissions.controller';
import { Role } from 'src/role/entities/role.entity';
import { Permission } from 'src/permissions/entities/permissions.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermission } from './entities/role_permissions.entity';
import { PermissionsService } from 'src/permissions/permissions.service';

@Module({
  imports:[
      TypeOrmModule.forFeature([Permission,Role,RolePermission])
    ],
  providers: [RolePermissionsService,PermissionsService],
  controllers: [RolePermissionsController]
})
export class RolePermissionsModule {}
