/**
 * India-only: GeoNames IN.txt se states + saari populated places (cities/towns) PostgreSQL mein.
 *
 * ## Files (auto-download project ke andar)
 *   cd backend && npm run india:download-geonames
 *   → `backend/storage/geonames/` mein IN.txt + admin1CodesASCII.txt
 *   (CC-BY GeoNames — https://www.geonames.org/ attribution)
 *
 * ## Env
 *   GEONAMES_DIR=/path/containing/IN.txt+admin1CodesASCII.txt
 *   MIN_POPULATION=100   default (towns/villages threshold; kam = zyada rows)
 *   MIN_POPULATION=0     poora dump (2L+ rows) — CONFIRM=1 zaroori
 *
 * ## Pehle
 *   npm run countries:seed   # India row honi chahiye
 *   migrations run honi chahiye
 *
 * ## Run
 *   GEONAMES_DIR=/path/to/dir npm run india:import-geonames
 *   MIN_POPULATION=0 CONFIRM=1 GEONAMES_DIR=... npm run india:import-geonames   # maximum rows
 *
 * Ye script sirf India (iso IN) ke geo_states / geo_cities / geo_pincodes delete karke dubara bharti hai.
 * Asli India Post pincode yahan nahi — har city par synthetic 6-digit unique placeholder (India format).
 */
import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import type { EntityManager } from 'typeorm';
import dataSource from '../database/data-source';
import { Country } from '../common/entities/country.entity';
import { GeoCity } from '../common/entities/geo-city.entity';
import { GeoPincode } from '../common/entities/geo-pincode.entity';
import { GeoState } from '../common/entities/geo-state.entity';

const IN_ISO = 'IN';

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

function parseInLine(line: string): {
  geonameid: number;
  name: string;
  featureClass: string;
  featureCode: string;
  admin1: string;
  population: number;
} | null {
  const p = line.split('\t');
  if (p.length < 15) return null;
  const geonameid = Number(p[0]);
  const name = p[1]?.trim();
  const featureClass = p[6]?.trim() ?? '';
  const featureCode = p[7]?.trim() ?? '';
  const admin1 = p[10]?.trim() ?? '';
  const population = Number(p[14] ?? '0') || 0;
  if (!name || !Number.isFinite(geonameid)) return null;
  return { geonameid, name: name.slice(0, 255), featureClass, featureCode, admin1: admin1.slice(0, 32), population };
}

/** 6-digit synthetic India-style pin (unique per geoname id) — replace with India Post CSV later. */
function syntheticIndiaPin(geonameid: number): string {
  const n = 100000 + (Math.abs(geonameid * 7919) % 900000);
  return String(n);
}

async function deleteIndiaGeo(em: EntityManager, indiaCountryId: string): Promise<void> {
  await em.query(
    `DELETE FROM geo_pincodes WHERE city_id IN (
      SELECT city_id FROM geo_cities WHERE state_id IN (
        SELECT state_id FROM geo_states WHERE country_id = $1
      )
    )`,
    [indiaCountryId],
  );
  await em.query(
    `DELETE FROM geo_cities WHERE state_id IN (
      SELECT state_id FROM geo_states WHERE country_id = $1
    )`,
    [indiaCountryId],
  );
  await em.query(`DELETE FROM geo_states WHERE country_id = $1`, [indiaCountryId]);
}

async function run() {
  const envDir = process.env.GEONAMES_DIR?.trim();
  const defaultDir = path.join(process.cwd(), 'storage', 'geonames');
  const dir = envDir || defaultDir;
  if (!envDir && !fs.existsSync(path.join(defaultDir, 'IN.txt'))) {
    console.error(
      'GeoNames files missing. Run from backend folder:\n  npm run india:download-geonames\nThen:\n  npm run india:import-geonames\nOr set GEONAMES_DIR to a folder that has IN.txt + admin1CodesASCII.txt',
    );
    process.exit(1);
  }
  if (envDir && !fs.existsSync(path.join(envDir, 'IN.txt'))) {
    console.error(`GEONAMES_DIR=${envDir} but IN.txt not found there.`);
    process.exit(1);
  }
  const minPop = process.env.MIN_POPULATION !== undefined ? Number(process.env.MIN_POPULATION) : 100;
  if (Number.isNaN(minPop)) {
    console.error('MIN_POPULATION must be a number');
    process.exit(1);
  }
  if (minPop === 0 && process.env.CONFIRM !== '1') {
    console.error(
      'MIN_POPULATION=0 imports 2+ lakh rows. Add CONFIRM=1 or use default MIN_POPULATION=100 for a large but bounded set.',
    );
    process.exit(1);
  }

  const pathIn = path.join(dir, 'IN.txt');
  const pathAdmin1 = path.join(dir, 'admin1CodesASCII.txt');
  if (!fs.existsSync(pathIn) || !fs.existsSync(pathAdmin1)) {
    console.error(`Missing ${pathIn} or ${pathAdmin1}`);
    process.exit(1);
  }

  await dataSource.initialize();
  const em = dataSource.manager;

  const india = await em.findOne(Country, { where: { isoCode: IN_ISO } });
  if (!india) {
    console.error('Country India (IN) not in DB. Run: npm run countries:seed');
    await dataSource.destroy();
    process.exit(1);
  }

  await em.transaction(async (trx) => {
    await deleteIndiaGeo(trx, india.countryId);

    const stateIdByKey = new Map<string, string>();
    const admin1Text = fs.readFileSync(pathAdmin1, 'utf8');
    let statesCreated = 0;
    for (const line of admin1Text.split('\n')) {
      const row = parseAdmin1Line(line);
      if (!row || row.countryIso !== IN_ISO) continue;
      const key = `${IN_ISO}:${row.code}`;
      if (stateIdByKey.has(key)) continue;
      let st = await trx.findOne(GeoState, { where: { countryId: india.countryId, code: row.code } });
      if (!st) {
        st = await trx.save(
          GeoState,
          trx.create(GeoState, {
            countryId: india.countryId,
            code: row.code,
            name: row.name,
            status: 'active',
          }),
        );
        statesCreated += 1;
      }
      stateIdByKey.set(key, st.stateId);
    }

    const seenName = new Map<string, number>();

    const fileStream = fs.createReadStream(pathIn, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const BATCH = 250;
    let lines = 0;
    let skipped = 0;
    let citiesInserted = 0;
    const batch: { city: GeoCity; pin: string }[] = [];

    const flush = async () => {
      if (batch.length === 0) return;
      const citiesEnt = batch.map((b) => b.city);
      const savedCities = await trx.save(GeoCity, citiesEnt);
      const pins = savedCities.map((c, i) =>
        trx.create(GeoPincode, { cityId: c.cityId, code: batch[i].pin, status: 'active' }),
      );
      await trx.save(GeoPincode, pins);
      citiesInserted += savedCities.length;
      batch.length = 0;
    };

    for await (const line of rl) {
      lines += 1;
      if (lines % 100000 === 0) {
        console.log(`[india-import] scanned ${lines} lines, cities so far ${citiesInserted}...`);
      }

      const row = parseInLine(line);
      if (!row) {
        skipped += 1;
        continue;
      }
      if (row.population < minPop) {
        skipped += 1;
        continue;
      }
      if (row.featureClass !== 'P') {
        skipped += 1;
        continue;
      }

      const sk = `${IN_ISO}:${row.admin1}`;
      let stateId = stateIdByKey.get(sk);
      if (!stateId) {
        let st = await trx.findOne(GeoState, { where: { countryId: india.countryId, code: row.admin1 } });
        if (!st) {
          st = await trx.save(
            GeoState,
            trx.create(GeoState, {
              countryId: india.countryId,
              code: row.admin1,
              name: `${IN_ISO}-${row.admin1}`,
              status: 'active',
            }),
          );
          statesCreated += 1;
        }
        stateId = st.stateId;
        stateIdByKey.set(sk, stateId);
      }

      let cityName = row.name;
      const uniqKey = `${stateId}:${cityName.toLowerCase()}`;
      const n = seenName.get(uniqKey) ?? 0;
      seenName.set(uniqKey, n + 1);
      if (n > 0) {
        cityName = `${cityName} (${row.geonameid})`.slice(0, 255);
      }

      const pin = syntheticIndiaPin(row.geonameid);
      batch.push({
        city: trx.create(GeoCity, { stateId, name: cityName, status: 'active' }),
        pin,
      });

      if (batch.length >= BATCH) {
        await flush();
      }
    }

    await flush();

    console.log(
      `[india-import] done lines=${lines} skipped=${skipped} states=${statesCreated} cities=${citiesInserted} (min_pop=${minPop})`,
    );
  });

  await dataSource.destroy();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
