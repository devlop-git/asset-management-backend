import { Injectable } from '@nestjs/common';
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
    return this.userRepository.findOne({ where: { email }, relations: ['role'] });
  }

  async create(name: string, email: string, password: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = await this.roleRepository.findOne({ where: { name: 'user' } });
    if (!userRole) {
      throw new Error('Default user role not found');
    }
    const defaultRoleId = Number(userRole.id);
    const user = this.userRepository.create({ name, email, password: hashedPassword, role_id: defaultRoleId });
    return this.userRepository.save(user);
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
