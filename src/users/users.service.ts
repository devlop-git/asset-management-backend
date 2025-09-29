import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/users.entity';
import { Role } from 'src/role/entities/role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findOne(email: string): Promise<User | undefined> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['role'],
    });
    if (user) {
      return user;
    }
    return undefined;
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    const { password, role, ...rest } = user;
    // Only include role name
    const userWithRoleName = {
      ...rest,
      role: role ? { name: role.name } : undefined,
    } as User;
    return userWithRoleName;
  }

  async findAll(): Promise<User[]> {
    const users = await this.userRepository.find({ relations: ['role'] });
    // Remove password and only include role name for each user
    return users.map(
      ({ password, role, ...rest }) =>
        ({
          ...rest,
          role: role ? { name: role.name } : undefined,
        }) as User,
    );
  }

  async create(
    name: string,
    email: string,
    password: string,
    role: string = null,
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = await this.roleRepository.findOne({
      where: { name: 'user' },
    });
    if (!userRole) {
      throw new Error('Default user role not found');
    }
    const defaultRoleId = role ? Number(role) : Number(userRole.id);
    const user = this.userRepository.create({
      name,
      email,
      password: hashedPassword,
      role_id: defaultRoleId,
    });
    return this.userRepository.save(user);
  }

  async update(id: number, updateData: Partial<User>): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    await this.userRepository.remove(user);
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
