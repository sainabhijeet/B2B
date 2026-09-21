import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportTicket } from '../../common/entities/support-ticket.entity';
import { PLATFORM_ROLES, UserRole } from '../../common/enums/user-role.enum';
import { JwtUserPayload } from '../../common/types/authenticated-request.type';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';
import { CreateStorefrontInquiryDto } from './dto/create-storefront-inquiry.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketsRepo: Repository<SupportTicket>,
    private readonly notifications: NotificationsService,
  ) {}

  async createStorefrontInquiry(
    tenantId: string,
    dto: CreateStorefrontInquiryDto,
  ) {
    const saved = await this.ticketsRepo.save(
      this.ticketsRepo.create({
        tenantId,
        createdBy: null,
        contactName: dto.name.trim(),
        contactEmail: dto.email.trim().toLowerCase(),
        subject: dto.subject.trim(),
        description: dto.message.trim(),
        priority: 'MEDIUM',
        status: 'OPEN',
      }),
    );
    await this.notifications.createForTenantStaff({
      tenantId,
      type: 'SUPPORT_TICKET_CREATED',
      title: 'New support request',
      message: `${saved.contactName ?? 'A customer'}: ${saved.subject}`,
      entityType: 'support_ticket',
      entityId: saved.id,
      actionUrl: '/support',
      metadata: { ticketId: saved.id, priority: saved.priority },
    });
    return {
      success: true,
      data: { id: saved.id, status: saved.status },
      meta: {},
      message: 'Your message has been sent to the store support team.',
    };
  }

  async create(user: JwtUserPayload, dto: CreateSupportTicketDto) {
    if (!user.tenantId)
      throw new ForbiddenException('Tenant context required.');
    const saved = await this.ticketsRepo.save(
      this.ticketsRepo.create({
        tenantId: user.tenantId,
        createdBy: user.sub,
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority ?? 'MEDIUM',
        status: 'OPEN',
      }),
    );
    if (user.role === UserRole.CUSTOMER) {
      await this.notifications.createForTenantStaff({
        tenantId: user.tenantId,
        type: 'SUPPORT_TICKET_CREATED',
        title: 'New support request',
        message: saved.subject,
        entityType: 'support_ticket',
        entityId: saved.id,
        actionUrl: '/support',
        metadata: { ticketId: saved.id, priority: saved.priority },
      });
    }
    return { success: true, data: saved, meta: {}, message: '' };
  }

  async list(user: JwtUserPayload) {
    let data: SupportTicket[];
    if (PLATFORM_ROLES.includes(user.role)) {
      data = await this.ticketsRepo.find({ order: { createdAt: 'DESC' } });
    } else if (user.role === UserRole.CUSTOMER) {
      if (!user.tenantId)
        throw new ForbiddenException('Tenant context required.');
      data = await this.ticketsRepo.find({
        where: { tenantId: user.tenantId, createdBy: user.sub },
        order: { createdAt: 'DESC' },
      });
    } else {
      data = await this.ticketsRepo.find({
        where: { tenantId: user.tenantId ?? undefined },
        order: { createdAt: 'DESC' },
      });
    }
    return { success: true, data, meta: {}, message: '' };
  }

  async update(user: JwtUserPayload, id: string, dto: UpdateSupportTicketDto) {
    const ticket = await this.ticketsRepo.findOne({ where: { id } });
    if (!ticket) throw new BadRequestException('Support ticket not found.');
    if (
      !PLATFORM_ROLES.includes(user.role) &&
      ticket.tenantId !== user.tenantId
    ) {
      throw new ForbiddenException('Cross-tenant access denied.');
    }
    if (dto.status !== undefined) ticket.status = dto.status;
    if (dto.priority !== undefined) ticket.priority = dto.priority;
    const saved = await this.ticketsRepo.save(ticket);
    if (saved.createdBy) {
      await this.notifications.createForUser({
        tenantId: saved.tenantId,
        userId: saved.createdBy,
        type: 'SUPPORT_TICKET_UPDATED',
        title: 'Support request updated',
        message: `${saved.subject} is now ${saved.status.toLowerCase()}.`,
        entityType: 'support_ticket',
        entityId: saved.id,
        metadata: { ticketId: saved.id, status: saved.status },
      });
    }
    return { success: true, data: saved, meta: {}, message: '' };
  }
}
