import type { CityRow, GeoStatus, PincodeRow, StateRow } from '@/lib/locationDemoData';

export type PaginatedOf<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type StateApiRow = {
  stateId: string;
  countryId: string;
  name: string;
  code: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type StateAdminApiRow = StateApiRow & { countryName: string };

export type CityApiRow = {
  cityId: string;
  stateId: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CityAdminApiRow = CityApiRow & {
  stateName: string;
  countryId: string;
  countryName: string;
};

export type PincodeApiRow = {
  pincodeId: string;
  cityId: string;
  code: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PincodeAdminApiRow = PincodeApiRow & {
  cityName: string;
  stateId: string;
  stateName: string;
  countryId: string;
  countryName: string;
};

export function mapStateApiToRow(s: StateApiRow): StateRow {
  const st = s.status === 'inactive' ? 'inactive' : 'active';
  return {
    stateId: s.stateId,
    countryId: s.countryId,
    name: s.name,
    code: s.code,
    status: st as GeoStatus,
  };
}

export function mapCityApiToRow(c: CityApiRow): CityRow {
  const st = c.status === 'inactive' ? 'inactive' : 'active';
  return {
    cityId: c.cityId,
    stateId: c.stateId,
    name: c.name,
    status: st as GeoStatus,
  };
}

export function mapPincodeApiToRow(p: PincodeApiRow): PincodeRow {
  const st = p.status === 'inactive' ? 'inactive' : 'active';
  return {
    pincodeId: p.pincodeId,
    cityId: p.cityId,
    code: p.code,
    status: st as GeoStatus,
  };
}
