import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeoCity } from '../../common/entities/geo-city.entity';
import { GeoPincode } from '../../common/entities/geo-pincode.entity';
import { GeoState } from '../../common/entities/geo-state.entity';
import type { ListAdminCitiesQueryDto } from './dto/list-admin-cities.query.dto';
import type { ListAdminPincodesQueryDto } from './dto/list-admin-pincodes.query.dto';
import type { ListAdminStatesQueryDto } from './dto/list-admin-states.query.dto';

export type StateResponse = {
  stateId: string;
  countryId: string;
  name: string;
  code: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type StateAdminResponse = StateResponse & { countryName: string };

export type CityResponse = {
  cityId: string;
  stateId: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CityAdminResponse = CityResponse & {
  stateName: string;
  countryId: string;
  countryName: string;
};

export type PincodeResponse = {
  pincodeId: string;
  cityId: string;
  code: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PincodeAdminResponse = PincodeResponse & {
  cityName: string;
  stateId: string;
  stateName: string;
  countryId: string;
  countryName: string;
};

function normalizePageLimit(page?: number, limit?: number): { page: number; limit: number } {
  const p = page && page > 0 ? page : 1;
  const l = limit && limit > 0 ? Math.min(limit, 100) : 25;
  return { page: p, limit: l };
}

function sanitizeSearch(raw?: string): string | undefined {
  const t = raw?.trim().replace(/[%_\\]/g, '').trim();
  return t || undefined;
}

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(GeoState)
    private readonly stateRepo: Repository<GeoState>,
    @InjectRepository(GeoCity)
    private readonly cityRepo: Repository<GeoCity>,
    @InjectRepository(GeoPincode)
    private readonly pincodeRepo: Repository<GeoPincode>,
  ) {}

  private st(s: GeoState): StateResponse {
    return {
      stateId: s.stateId,
      countryId: s.countryId,
      name: s.name,
      code: s.code,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }

  private ci(c: GeoCity): CityResponse {
    return {
      cityId: c.cityId,
      stateId: c.stateId,
      name: c.name,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  private pi(p: GeoPincode): PincodeResponse {
    return {
      pincodeId: p.pincodeId,
      cityId: p.cityId,
      code: p.code,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  async findStatesPublic(countryId: string): Promise<StateResponse[]> {
    const rows = await this.stateRepo.find({
      where: { countryId, status: 'active' },
      order: { name: 'ASC' },
    });
    return rows.map((r) => this.st(r));
  }

  async findCitiesPublic(stateId: string): Promise<CityResponse[]> {
    const rows = await this.cityRepo.find({
      where: { stateId, status: 'active' },
      order: { name: 'ASC' },
    });
    return rows.map((r) => this.ci(r));
  }

  async findPincodesPublic(cityId: string): Promise<PincodeResponse[]> {
    const rows = await this.pincodeRepo.find({
      where: { cityId, status: 'active' },
      order: { code: 'ASC' },
    });
    return rows.map((r) => this.pi(r));
  }

  async findStatesAdminPage(query: ListAdminStatesQueryDto): Promise<{
    items: StateAdminResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit } = normalizePageLimit(query.page, query.limit);
    const search = sanitizeSearch(query.search);
    const qb = this.stateRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.country', 'c')
      .where('s.countryId = :countryId', { countryId: query.countryId })
      .orderBy('s.name', 'ASC');
    if (search) {
      qb.andWhere('(LOWER(s.name) LIKE LOWER(:s) OR LOWER(s.code) LIKE LOWER(:s))', { s: `%${search}%` });
    }
    const total = await qb.getCount();
    const rows = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    const items: StateAdminResponse[] = rows.map((s) => ({
      ...this.st(s),
      countryName: s.country?.name ?? '—',
    }));
    return { items, total, page, limit };
  }

  async findCitiesAdminPage(query: ListAdminCitiesQueryDto): Promise<{
    items: CityAdminResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit } = normalizePageLimit(query.page, query.limit);
    const search = sanitizeSearch(query.search);
    const qb = this.cityRepo
      .createQueryBuilder('ci')
      .leftJoinAndSelect('ci.state', 'st')
      .leftJoinAndSelect('st.country', 'co')
      .where('ci.stateId = :stateId', { stateId: query.stateId })
      .orderBy('ci.name', 'ASC');
    if (search) {
      qb.andWhere('LOWER(ci.name) LIKE LOWER(:s)', { s: `%${search}%` });
    }
    const total = await qb.getCount();
    const rows = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    const items: CityAdminResponse[] = rows.map((ci) => ({
      ...this.ci(ci),
      stateName: ci.state?.name ?? '—',
      countryId: ci.state?.countryId ?? '',
      countryName: ci.state?.country?.name ?? '—',
    }));
    return { items, total, page, limit };
  }

  async findPincodesAdminPage(query: ListAdminPincodesQueryDto): Promise<{
    items: PincodeAdminResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page, limit } = normalizePageLimit(query.page, query.limit);
    const search = sanitizeSearch(query.search);
    const qb = this.pincodeRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.city', 'ci')
      .leftJoinAndSelect('ci.state', 'st')
      .leftJoinAndSelect('st.country', 'co')
      .where('p.cityId = :cityId', { cityId: query.cityId })
      .orderBy('p.code', 'ASC');
    if (search) {
      qb.andWhere('LOWER(p.code) LIKE LOWER(:s)', { s: `%${search}%` });
    }
    const total = await qb.getCount();
    const rows = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
    const items: PincodeAdminResponse[] = rows.map((p) => ({
      ...this.pi(p),
      cityName: p.city?.name ?? '—',
      stateId: p.city?.stateId ?? '',
      stateName: p.city?.state?.name ?? '—',
      countryId: p.city?.state?.countryId ?? '',
      countryName: p.city?.state?.country?.name ?? '—',
    }));
    return { items, total, page, limit };
  }
}
