import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformWhatsappNumber } from '../../../common/entities/platform-whatsapp-number.entity';
import { Tenant } from '../../../common/entities/tenant.entity';
import { EnableTenantWhatsappDto } from '../dto/enable-tenant-whatsapp.dto';

export type TenantWhatsappStatusDto = {
  isActive: boolean;
  phoneNumberId: string | null;
  webhookVerified: boolean;
  useOwnToken: boolean;
};

@Injectable()
export class PlatformTenantWhatsappService {
  constructor(
    @InjectRepository(PlatformWhatsappNumber)
    private readonly waRepo: Repository<PlatformWhatsappNumber>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
  ) {}

  private async ensureTenant(tenantId: string): Promise<void> {
    const ok = await this.tenantRepo.exist({ where: { id: tenantId } });
    if (!ok) throw new NotFoundException('Tenant not found.');
  }

  async getStatus(tenantId: string): Promise<{ success: true; data: TenantWhatsappStatusDto }> {
    await this.ensureTenant(tenantId);
    const active = await this.waRepo.findOne({
      where: { tenantId, isActive: true },
      order: { createdAt: 'DESC' },
    });
    const latest = await this.waRepo.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    const row = active ?? latest;
    return {
      success: true,
      data: {
        isActive: !!active,
        phoneNumberId: row?.phoneNumberId ?? null,
        webhookVerified: row?.webhookVerified ?? false,
        useOwnToken: row?.useOwnToken === true,
      },
    };
  }

  async enable(
    tenantId: string,
    dto: EnableTenantWhatsappDto,
  ): Promise<{ success: true; data: TenantWhatsappStatusDto }> {
    await this.ensureTenant(tenantId);
    const phoneNumberId = dto.phoneNumberId.trim();
    const useOwn = dto.useOwnToken === true;
    const incomingToken = dto.accessToken?.trim() ?? '';
    const incomingVerify = dto.verifyToken?.trim() ?? '';
    const incomingAppSecret = dto.appSecret?.trim() ?? '';
    const incomingWaba = dto.whatsappBusinessAccountId?.trim() ?? '';

    const byPhone = await this.waRepo.findOne({ where: { phoneNumberId } });
    if (byPhone && byPhone.tenantId !== tenantId) {
      throw new ConflictException('This phone number id is already mapped to another tenant.');
    }

    await this.waRepo
      .createQueryBuilder()
      .update(PlatformWhatsappNumber)
      .set({ isActive: false })
      .where('tenant_id = :tenantId', { tenantId })
      .execute();

    if (byPhone) {
      byPhone.isActive = true;
      byPhone.useOwnToken = useOwn;
      if (!useOwn) {
        byPhone.accessToken = null;
        byPhone.webhookVerifyToken = null;
        byPhone.appSecret = null;
      } else {
        if (incomingToken) {
          byPhone.accessToken = incomingToken;
        } else if (!byPhone.accessToken?.trim()) {
          throw new BadRequestException('accessToken is required when use_own_token is true.');
        }
        if (incomingVerify) {
          byPhone.webhookVerifyToken = incomingVerify;
        } else if (!byPhone.webhookVerifyToken?.trim()) {
          throw new BadRequestException('verifyToken is required when use_own_token is true.');
        }
        if (incomingAppSecret) {
          byPhone.appSecret = incomingAppSecret;
        } else if (!byPhone.appSecret?.trim()) {
          throw new BadRequestException('appSecret is required when use_own_token is true.');
        }
      }
      if (incomingWaba) {
        byPhone.whatsappBusinessAccountId = incomingWaba;
      }
      await this.waRepo.save(byPhone);
      return {
        success: true,
        data: {
          isActive: true,
          phoneNumberId: byPhone.phoneNumberId,
          webhookVerified: byPhone.webhookVerified,
          useOwnToken: byPhone.useOwnToken === true,
        },
      };
    }

    if (useOwn) {
      if (!incomingToken) {
        throw new BadRequestException('accessToken is required when use_own_token is true.');
      }
      if (!incomingVerify) {
        throw new BadRequestException('verifyToken is required when use_own_token is true.');
      }
      if (!incomingAppSecret) {
        throw new BadRequestException('appSecret is required when use_own_token is true.');
      }
    }

    const row = this.waRepo.create({
      phoneNumberId,
      tenantId,
      isActive: true,
      accessToken: useOwn ? incomingToken : null,
      useOwnToken: useOwn,
      webhookVerifyToken: useOwn ? incomingVerify : null,
      appSecret: useOwn ? incomingAppSecret : null,
      webhookVerified: false,
      whatsappBusinessAccountId: incomingWaba || null,
    });
    await this.waRepo.save(row);
    return {
      success: true,
      data: {
        isActive: true,
        phoneNumberId: row.phoneNumberId,
        webhookVerified: false,
        useOwnToken: row.useOwnToken === true,
      },
    };
  }

  async disable(tenantId: string): Promise<{ success: true; data: TenantWhatsappStatusDto }> {
    await this.ensureTenant(tenantId);
    await this.waRepo.update({ tenantId }, { isActive: false });
    return this.getStatus(tenantId);
  }
}
