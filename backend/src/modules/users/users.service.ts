import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/enums/user-role.enum';
import { User } from '../../common/entities/user.entity';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateUserDto, actor?: JwtUserPayload): Promise<User> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Either email or phone is required.');
    }
    if (actor && !this.isAdminRole(actor.role) && actor.tenantId !== (dto.tenantId ?? null)) {
      throw new ForbiddenException('Cannot create users for another tenant.');
    }

    const user = this.usersRepository.create({
      tenantId: dto.tenantId ?? null,
      email: dto.email?.toLowerCase() ?? null,
      phone: dto.phone ?? null,
      passwordHash: dto.password ? await bcrypt.hash(dto.password, 12) : null,
      role: dto.role,
      customerId: dto.customerId ?? null,
    });
    const saved = await this.usersRepository.save(user);
    await this.auditLogsService.log({
      action: 'USER_CREATED',
      tenantId: saved.tenantId,
      actorUserId: actor?.sub ?? null,
      metadata: { createdUserId: saved.id, role: saved.role },
    });
    return saved;
  }

  async findById(id: string, actor?: JwtUserPayload): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    if (
      actor &&
      !this.isAdminRole(actor.role) &&
      actor.tenantId &&
      user.tenantId !== actor.tenantId
    ) {
      throw new ForbiddenException('Cannot access users from another tenant.');
    }
    return user;
  }

  async findAdminByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase(), tenantId: IsNull() },
    });
  }

  async findTenantUserByPhone(tenantId: string, phone: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { tenantId, phone },
    });
  }

  async findTenantCustomerUserByPhone(tenantId: string, phone: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { tenantId, phone, role: UserRole.CUSTOMER },
    });
  }

  /** Distributor owner (one tenant) identified by full national/international digits on user.phone. */
  async findDistributorOwnerByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: {
        phone,
        role: UserRole.OWNER,
        tenantId: Not(IsNull()),
      },
    });
  }

  async findTenantOwner(tenantId: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { tenantId, role: UserRole.OWNER, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
  }

  async markPhoneVerified(userId: string): Promise<void> {
    await this.usersRepository.update({ id: userId }, { phoneVerifiedAt: new Date() });
  }

  async setCustomerId(userId: string, customerId: string): Promise<void> {
    await this.usersRepository.update({ id: userId }, { customerId });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email: email.toLowerCase() } });
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.usersRepository.update({ id: userId }, { passwordHash });
  }

  isAdminRole(role: UserRole): boolean {
    return role === UserRole.SUPER_ADMIN || role === UserRole.PLATFORM_SUPPORT;
  }
}
