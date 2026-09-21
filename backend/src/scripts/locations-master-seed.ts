/**
 * Seeds geo_states, geo_cities, geo_pincodes for all countries present in location-seed.data.
 * Idempotent: inserts missing states/cities/pincodes per country/code/name.
 *
 *   npm run locations:seed
 */
import 'dotenv/config';
import dataSource from '../database/data-source';
import { Country } from '../common/entities/country.entity';
import { GeoCity } from '../common/entities/geo-city.entity';
import { GeoPincode } from '../common/entities/geo-pincode.entity';
import { GeoState } from '../common/entities/geo-state.entity';
import { ALL_LOCATION_SEED_ROWS } from './data/location-seed.data';

function stateKey(iso: string, code: string): string {
  return `${iso}:${code}`;
}

async function run() {
  await dataSource.initialize();
  const countryRepo = dataSource.getRepository(Country);
  const stateRepo = dataSource.getRepository(GeoState);
  const cityRepo = dataSource.getRepository(GeoCity);
  const pincodeRepo = dataSource.getRepository(GeoPincode);

  const countries = await countryRepo.find();
  const countryIdByIso = new Map(countries.map((c) => [c.isoCode, c.countryId]));
  const stateIdByKey = new Map<string, string>();
  let statesCreated = 0;
  let statesUpdated = 0;

  for (const row of ALL_LOCATION_SEED_ROWS) {
    const cid = countryIdByIso.get(row.countryIso);
    if (!cid) {
      console.warn(`[locations-master-seed] skip row - country ${row.countryIso} not in DB`);
      continue;
    }

    const sk = stateKey(row.countryIso, row.stateCode);
    if (stateIdByKey.has(sk)) continue;

    const existing = await stateRepo.findOne({ where: { countryId: cid, code: row.stateCode } });
    if (existing) {
      let changed = false;
      if (existing.name !== row.stateName) {
        existing.name = row.stateName;
        changed = true;
      }
      if (existing.status !== 'active') {
        existing.status = 'active';
        changed = true;
      }
      const saved = changed ? await stateRepo.save(existing) : existing;
      if (changed) statesUpdated += 1;
      stateIdByKey.set(sk, saved.stateId);
      continue;
    }

    const saved = await stateRepo.save(
      stateRepo.create({
        countryId: cid,
        code: row.stateCode,
        name: row.stateName,
        status: 'active',
      }),
    );
    statesCreated += 1;
    stateIdByKey.set(sk, saved.stateId);
  }

  let citiesCreated = 0;
  let citiesUpdated = 0;
  let pinsCreated = 0;
  let pinsUpdated = 0;

  for (const row of ALL_LOCATION_SEED_ROWS) {
    const sid = stateIdByKey.get(stateKey(row.countryIso, row.stateCode));
    if (!sid) continue;

    let city = await cityRepo.findOne({ where: { stateId: sid, name: row.cityName } });
    if (city) {
      if (city.status !== 'active') {
        city.status = 'active';
        city = await cityRepo.save(city);
        citiesUpdated += 1;
      }
    } else {
      city = await cityRepo.save(
        cityRepo.create({
          stateId: sid,
          name: row.cityName,
          status: 'active',
        }),
      );
      citiesCreated += 1;
    }

    const pin = await pincodeRepo.findOne({ where: { cityId: city.cityId, code: row.postalCode } });
    if (pin) {
      if (pin.status !== 'active') {
        pin.status = 'active';
        await pincodeRepo.save(pin);
        pinsUpdated += 1;
      }
      continue;
    }

    await pincodeRepo.save(
      pincodeRepo.create({
        cityId: city.cityId,
        code: row.postalCode,
        status: 'active',
      }),
    );
    pinsCreated += 1;
  }

  console.log(
    `[locations-master-seed] done states(created=${statesCreated}, updated=${statesUpdated}, seen=${stateIdByKey.size}) cities(created=${citiesCreated}, updated=${citiesUpdated}) pincodes(created=${pinsCreated}, updated=${pinsUpdated})`,
  );
  await dataSource.destroy();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
