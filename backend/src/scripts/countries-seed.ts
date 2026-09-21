/**
 * Phase-1 countries (idempotent by iso_code). Run after migrations:
 *
 *   npm run countries:seed
 */
import 'dotenv/config';
import dataSource from '../database/data-source';
import { Country } from '../common/entities/country.entity';

const SAMPLES: Array<{
  name: string;
  isoCode: string;
  phoneCode: string;
  phoneNationalMin: number | null;
  phoneNationalMax: number | null;
  currency: string;
  defaultLanguage: string;
  status: string;
  timezone: string | null;
  currencySymbol: string | null;
  taxSystem: string | null;
}> = [
  {
    name: 'India',
    isoCode: 'IN',
    phoneCode: '+91',
    phoneNationalMin: 10,
    phoneNationalMax: 10,
    currency: 'INR',
    defaultLanguage: 'hi',
    status: 'active',
    timezone: 'Asia/Kolkata',
    currencySymbol: '₹',
    taxSystem: 'GST',
  },
  {
    name: 'France',
    isoCode: 'FR',
    phoneCode: '+33',
    phoneNationalMin: 9,
    phoneNationalMax: 9,
    currency: 'EUR',
    defaultLanguage: 'fr',
    status: 'active',
    timezone: 'Europe/Paris',
    currencySymbol: '€',
    taxSystem: 'VAT',
  },
  {
    name: 'United States',
    isoCode: 'US',
    phoneCode: '+1',
    phoneNationalMin: 10,
    phoneNationalMax: 10,
    currency: 'USD',
    defaultLanguage: 'en',
    status: 'active',
    timezone: 'America/New_York',
    currencySymbol: '$',
    taxSystem: 'Sales tax (state)',
  },
  {
    name: 'United Arab Emirates',
    isoCode: 'AE',
    phoneCode: '+971',
    phoneNationalMin: 9,
    phoneNationalMax: 9,
    currency: 'AED',
    defaultLanguage: 'ar',
    status: 'active',
    timezone: 'Asia/Dubai',
    currencySymbol: 'د.إ',
    taxSystem: 'VAT',
  },
  {
    name: 'United Kingdom',
    isoCode: 'GB',
    phoneCode: '+44',
    phoneNationalMin: 10,
    phoneNationalMax: 11,
    currency: 'GBP',
    defaultLanguage: 'en',
    status: 'active',
    timezone: 'Europe/London',
    currencySymbol: '£',
    taxSystem: 'VAT',
  },
];

async function run() {
  await dataSource.initialize();
  const repo = dataSource.getRepository(Country);
  let created = 0;
  let skipped = 0;
  for (const s of SAMPLES) {
    const existing = await repo.findOne({ where: { isoCode: s.isoCode } });
    if (existing) {
      skipped += 1;
      console.log(`[countries-seed] skip iso=${s.isoCode}`);
      continue;
    }
    await repo.save(repo.create(s));
    created += 1;
    console.log(`[countries-seed] created ${s.name} (${s.isoCode})`);
  }
  console.log(`[countries-seed] done created=${created} skipped=${skipped}`);
  await dataSource.destroy();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
