import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../enums/user-role.enum';
import { UsersService } from '../../modules/users/users.service';

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit(): Promise<void> {
    const email = this.configService.get<string>('bootstrap.superAdminEmail');
    const password = this.configService.get<string>('bootstrap.superAdminPassword');
    if (!email || !password) return;

    const existing = await this.usersService.findAdminByEmail(email);
    if (existing) return;

    await this.usersService.create({
      email,
      password,
      role: UserRole.SUPER_ADMIN,
    });
    this.logger.log(`Bootstrapped SUPER_ADMIN user: ${email}`);
  }
}
