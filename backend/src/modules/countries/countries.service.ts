import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from '../../common/entities/country.entity';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

export type CountryResponse = {
  countryId: string;
  name: string;
  isoCode: string;
  phoneCode: string;
  /** Null = client uses auth default 5–14 digit national length. */
  phoneNationalMin: number | null;
  phoneNationalMax: number | null;
  currency: string;
  defaultLanguage: string;
  status: string;
  timezone: string | null;
  currencySymbol: string | null;
  taxSystem: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class CountriesService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepository: Repository<Country>,
  ) {}

  private toResponse(c: Country): CountryResponse {
    return {
      countryId: c.countryId,
      name: c.name,
      isoCode: c.isoCode,
      phoneCode: c.phoneCode,
      phoneNationalMin: c.phoneNationalMin ?? null,
      phoneNationalMax: c.phoneNationalMax ?? null,
      currency: c.currency,
      defaultLanguage: c.defaultLanguage,
      status: c.status,
      timezone: c.timezone,
      currencySymbol: c.currencySymbol,
      taxSystem: c.taxSystem,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  /** Active countries for signup / OTP country pickers (no auth). */
  async listPublic(): Promise<CountryResponse[]> {
    const rows = await this.countryRepository.find({
      where: { status: 'active' },
      order: { name: 'ASC' },
    });
    return rows.map((c) => this.toResponse(c));
  }

  /** Resolve country for signup phone (must be active). */
  async requireActiveCountry(countryId: string): Promise<CountryResponse> {
    const c = await this.countryRepository.findOne({ where: { countryId } });
    if (!c || c.status !== 'active') {
      throw new NotFoundException('Country not found.');
    }
    return this.toResponse(c);
  }

  async listAdminPaginated(
    page = 1,
    limit = 25,
    search?: string,
  ): Promise<{ items: CountryResponse[]; total: number; page: number; limit: number }> {
    const safePage = page > 0 ? page : 1;
    const take = limit > 0 ? Math.min(limit, 100) : 25;
    const qb = this.countryRepository.createQueryBuilder('c').orderBy('c.name', 'ASC');
    const frag = search?.trim().replace(/[%_\\]/g, '').trim();
    if (frag) {
      qb.andWhere(
        '(LOWER(c.name) LIKE LOWER(:s) OR LOWER(c.iso_code) LIKE LOWER(:s) OR LOWER(c.phone_code) LIKE LOWER(:s))',
        { s: `%${frag}%` },
      );
    }
    const total = await qb.getCount();
    const rows = await qb
      .skip((safePage - 1) * take)
      .take(take)
      .getMany();
    return {
      items: rows.map((c) => this.toResponse(c)),
      total,
      page: safePage,
      limit: take,
    };
  }

  async getAdmin(countryId: string): Promise<CountryResponse> {
    const c = await this.countryRepository.findOne({ where: { countryId } });
    if (!c) throw new NotFoundException('Country not found.');
    return this.toResponse(c);
  }

  async create(dto: CreateCountryDto): Promise<CountryResponse> {
    const existing = await this.countryRepository.findOne({ where: { isoCode: dto.isoCode } });
    if (existing) throw new ConflictException('A country with this ISO code already exists.');
    const row = this.countryRepository.create({
      name: dto.name,
      isoCode: dto.isoCode,
      phoneCode: dto.phoneCode,
      phoneNationalMin: dto.phoneNationalMin ?? null,
      phoneNationalMax: dto.phoneNationalMax ?? null,
      currency: dto.currency,
      defaultLanguage: dto.defaultLanguage,
      status: dto.status,
      timezone: dto.timezone?.trim() ? dto.timezone.trim() : null,
      currencySymbol: dto.currencySymbol?.trim() ? dto.currencySymbol.trim() : null,
      taxSystem: dto.taxSystem?.trim() ? dto.taxSystem.trim() : null,
    });
    const saved = await this.countryRepository.save(row);
    return this.toResponse(saved);
  }

  async update(countryId: string, dto: UpdateCountryDto): Promise<CountryResponse> {
    const row = await this.countryRepository.findOne({ where: { countryId } });
    if (!row) throw new NotFoundException('Country not found.');
    if (dto.isoCode !== undefined && dto.isoCode !== row.isoCode) {
      const clash = await this.countryRepository.findOne({ where: { isoCode: dto.isoCode } });
      if (clash) throw new ConflictException('A country with this ISO code already exists.');
    }
    if (dto.name !== undefined) row.name = dto.name;
    if (dto.isoCode !== undefined) row.isoCode = dto.isoCode;
    if (dto.phoneCode !== undefined) row.phoneCode = dto.phoneCode;
    if (dto.phoneNationalMin !== undefined) row.phoneNationalMin = dto.phoneNationalMin ?? null;
    if (dto.phoneNationalMax !== undefined) row.phoneNationalMax = dto.phoneNationalMax ?? null;
    if (dto.currency !== undefined) row.currency = dto.currency;
    if (dto.defaultLanguage !== undefined) row.defaultLanguage = dto.defaultLanguage;
    if (dto.status !== undefined) row.status = dto.status;
    if (dto.timezone !== undefined) row.timezone = dto.timezone?.trim() ? dto.timezone.trim() : null;
    if (dto.currencySymbol !== undefined)
      row.currencySymbol = dto.currencySymbol?.trim() ? dto.currencySymbol.trim() : null;
    if (dto.taxSystem !== undefined) row.taxSystem = dto.taxSystem?.trim() ? dto.taxSystem.trim() : null;
    const saved = await this.countryRepository.save(row);
    return this.toResponse(saved);
  }
}
