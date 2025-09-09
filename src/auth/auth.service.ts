import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.usersService.findOne(email);
    if (
      user &&
      (await this.usersService.validatePassword(pass, user.password))
    ) {
      const { password, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async register(name: string, email: string, password: string) {
    // Check if user already exists
    const existingUser = await this.usersService.findOne(email);
    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }
    // Create new user
    const user = await this.usersService.create(name, email, password);
    // Optionally, auto-login after registration
    const payload = { sub: user.id, email: user.email, role: user.role?.name };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role?.name,
      },
    };
  }
  async login(email: string, password: string) {
    const user = await this.usersService.findOne(email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, name, email: email_id } = user;
    const payload = { sub: user.id, email: user.email, role: user.role?.name };
    return {
      user: {
        name,
        email: email_id,
      },
      access_token: this.jwtService.sign(payload),
    };
  }
}
