import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from './entities/role_permissions.entity';
import { PermissionsService } from '../permissions/permissions.service';
import { Role } from '../role/entities/role.entity';

@Injectable()
export class RolePermissionsService {
  constructor(
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly permissionsService: PermissionsService,
  ) {}

  async assignPermissionToRole(roleId: number, permissionId: number): Promise<RolePermission> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with id ${roleId} not found`);
    }
    const permission = await this.permissionsService.findOne(permissionId);
    const rolePermission = this.rolePermissionRepository.create({
      role,
      permission,
    });
    return this.rolePermissionRepository.save(rolePermission);
  }

  async findAll(): Promise<RolePermission[]> {
    return this.rolePermissionRepository.find({
      relations: ['role', 'permission'],
    });
  }

  async findByRole(roleId: number): Promise<RolePermission[]> {
    return this.rolePermissionRepository.find({
      where: { role: { id: roleId } },
      relations: ['role', 'permission'],
    });
  }

  async remove(id: number): Promise<void> {
    const rolePermission = await this.rolePermissionRepository.findOne({ where: { id } });
    if (!rolePermission) {
      throw new NotFoundException(`RolePermission with id ${id} not found`);
    }
    await this.rolePermissionRepository.remove(rolePermission);
  }
}
