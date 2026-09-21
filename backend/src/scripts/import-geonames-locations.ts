/**
 * Import countries / admin1 (states) / cities from GeoNames dumps into PostgreSQL.
 *
 * ## Data kahan se milega (free, CC-BY 4.0 — https://www.geonames.org/)
 * https://download.geonames.org/export/dump/
 *   - countryInfo.txt
 *   - admin1CodesASCII.txt
 *   - cities5000.zip → cities5000.txt  (ya cities15000.zip)
 *
 * ## Env
 *   GEONAMES_DIR=/path/with/those/files   (required)
 *   LIMIT=5000                             (optional, max cities to import)
 *   TRUNCATE_GEO=1                         truncate geo_* only (keeps countries)
 *   TRUNCATE_COUNTRIES=1                   truncate countries CASCADE (full reset of location tree)
 *
 * ## Run
 *   cd backend && npx ts-node src/scripts/import-geonames-locations.ts
 *
 * Pincodes: placeholder "00000" per city (GeoNames city file has no postal); refine with national datasets later.
 */
import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import dataSource from '../database/data-source';
import { Country } from '../common/entities/country.entity';
import { GeoCity } from '../common/entities/geo-city.entity';
import { GeoPincode } from '../common/entities/geo-pincode.entity';
import { GeoState } from '../common/entities/geo-state.entity';

function normPhone(raw: string | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return '+1';
  const first = s.split(/[,;/]/)[0]?.trim() ?? '';
  const digits = first.replace(/\D/g, '');
  if (!digits) return '+1';
  return `+${digits}`.slice(0, 16);
}

function normLang(raw: string | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return 'en';
  const first = s.split(/[,;]/)[0]?.trim() ?? 'en';
  const beforeDash = first.split('-')[0]?.trim() ?? 'en';
  return beforeDash.slice(0, 32) || 'en';
}

function parseCountryInfoLine(line: string): {
  iso: string;
  name: string;
  currency: string;
  phone: string;
  languages: string;
} | null {
  if (line.startsWith('#') || !line.trim()) return null;
  const p = line.split('\t');
  if (p.length < 13) return null;
  return {
    iso: p[0]!.trim().toUpperCase(),
    name: p[4]!.trim(),
    currency: (p[10] ?? 'XXX').trim().slice(0, 3).toUpperCase() || 'XXX',
    phone: p[12] ?? '',
    languages: p[15] ?? 'en',
  };
}

function parseAdmin1Line(line: string): { countryIso: string; code: string; name: string } | null {
  if (!line.trim()) return null;
  const p = line.split('\t');
  const full = p[0]?.trim();
  if (!full || !full.includes('.')) return null;
  const [ciso, adm] = full.split('.');
  if (!ciso || adm === undefined) return null;
  return {
    countryIso: ciso.toUpperCase(),
    code: adm.trim().slice(0, 32),
    name: (p[1] ?? full).trim().slice(0, 255),
  };
}

function parseCityLine(line: string): { name: string; countryIso: string; admin1: string } | null {
  const p = line.split('\t');
  if (p.length < 12) return null;
  const countryIso = p[8]?.trim().toUpperCase();
  const admin1 = p[10]?.trim() ?? '';
  const name = p[1]?.trim();
  if (!countryIso || !name || countryIso.length !== 2) return null;
  return { name: name.slice(0, 255), countryIso, admin1: admin1.slice(0, 32) };
}

async function run() {
  const dir = process.env.GEONAMES_DIR?.trim();
  if (!dir) {
    console.error('Set GEONAMES_DIR to the folder containing countryInfo.txt, admin1CodesASCII.txt, cities5000.txt');
    process.exit(1);
  }
  const limit = process.env.LIMIT ? Number(process.env.LIMIT) : 0;
  const truncateGeo = process.env.TRUNCATE_GEO === '1';
  const truncateCountries = process.env.TRUNCATE_COUNTRIES === '1';

  const pathCountry = path.join(dir, 'countryInfo.txt');
  const pathAdmin1 = path.join(dir, 'admin1CodesASCII.txt');
  const pathCities = path.join(dir, 'cities5000.txt');

  for (const f of [pathCountry, pathAdmin1, pathCities]) {
    if (!fs.existsSync(f)) {
      console.error(`Missing file: ${f}`);
      process.exit(1);
    }
  }

  await dataSource.initialize();
  const qr = dataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    if (truncateCountries) {
      await qr.query(`TRUNCATE TABLE countries CASCADE`);
    } else if (truncateGeo) {
      await qr.query(`TRUNCATE TABLE geo_pincodes, geo_cities, geo_states CASCADE`);
    }

    const em = qr.manager;
    const countryInfoText = fs.readFileSync(pathCountry, 'utf8');
    let countriesUpserted = 0;
    for (const line of countryInfoText.split('\n')) {
      const row = parseCountryInfoLine(line);
      if (!row) continue;
      let c = await em.findOne(Country, { where: { isoCode: row.iso } });
      const payload = {
        name: row.name,
        isoCode: row.iso,
        phoneCode: normPhone(row.phone),
        currency: row.currency.length === 3 ? row.currency : 'USD',
        defaultLanguage: normLang(row.languages),
        status: 'active',
        timezone: null as string | null,
        currencySymbol: null as string | null,
        taxSystem: null as string | null,
      };
      if (c) {
        Object.assign(c, payload);
        await em.save(Country, c);
      } else {
        await em.save(Country, em.create(Country, payload));
      }
      countriesUpserted += 1;
    }

    const countriesDb = await em.find(Country);
    const countryIdByIso = new Map(countriesDb.map((c) => [c.isoCode, c.countryId]));

    const admin1Text = fs.readFileSync(pathAdmin1, 'utf8');
    let statesInserted = 0;
    const stateIdByKey = new Map<string, string>();

    for (const line of admin1Text.split('\n')) {
      const row = parseAdmin1Line(line);
      if (!row) continue;
      const cid = countryIdByIso.get(row.countryIso);
      if (!cid) continue;
      const key = `${row.countryIso}:${row.code}`;
      let st = await em.findOne(GeoState, { where: { countryId: cid, code: row.code } });
      if (!st) {
        st = em.create(GeoState, {
          countryId: cid,
          code: row.code,
          name: row.name,
          status: 'active',
        });
        st = await em.save(GeoState, st);
        statesInserted += 1;
      }
      stateIdByKey.set(key, st.stateId);
    }

    const fileStream = fs.createReadStream(pathCities, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
    let citiesInserted = 0;
    let pinsInserted = 0;
    let inserted = 0;

    for await (const line of rl) {
      if (limit > 0 && inserted >= limit) break;
      const row = parseCityLine(line);
      if (!row) continue;
      const key = `${row.countryIso}:${row.admin1}`;
      let sid = stateIdByKey.get(key);
      const cid = countryIdByIso.get(row.countryIso);
      if (!cid) continue;

      if (!sid) {
        let st = await em.findOne(GeoState, { where: { countryId: cid, code: row.admin1 } });
        if (!st) {
          st = em.create(GeoState, {
            countryId: cid,
            code: row.admin1,
            name: `${row.countryIso}-${row.admin1}`,
            status: 'active',
          });
          st = await em.save(GeoState, st);
          statesInserted += 1;
        }
        sid = st.stateId;
        stateIdByKey.set(key, sid);
      }

      const exists = await em.findOne(GeoCity, { where: { stateId: sid, name: row.name } });
      if (exists) continue;

      const city = await em.save(
        GeoCity,
        em.create(GeoCity, { stateId: sid, name: row.name, status: 'active' }),
      );
      citiesInserted += 1;
      await em.save(
        GeoPincode,
        em.create(GeoPincode, { cityId: city.cityId, code: '00000', status: 'active' }),
      );
      pinsInserted += 1;
      inserted += 1;
    }

    await qr.commitTransaction();
    console.log(
      `[import-geonames] country_rows=${countriesUpserted} new_states=${statesInserted} state_keys=${stateIdByKey.size} cities=${citiesInserted} placeholder_pincodes=${pinsInserted}`,
    );
  } catch (e) {
    await qr.rollbackTransaction();
    throw e;
  } finally {
    await qr.release();
    await dataSource.destroy();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
