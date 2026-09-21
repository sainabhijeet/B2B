const { Client } = require('../../node_modules/pg');

const tenantId = 'a9f32f9c-b17a-4ef5-9724-96cd99d70c7a';
const wrongPatterns = ['Groccery', 'Groccerry', 'Grocerry', 'Groceryy'];

function fixed(value) {
  if (typeof value !== 'string') return value;
  return wrongPatterns.reduce(
    (out, wrong) => out.replace(new RegExp(wrong, 'gi'), 'Grocery'),
    value,
  );
}

async function tableExists(client, table) {
  const res = await client.query(
    `select exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = $1
    ) as ok`,
    [table],
  );
  return res.rows[0]?.ok === true;
}

async function columnExists(client, table, column) {
  const res = await client.query(
    `select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = $1 and column_name = $2
    ) as ok`,
    [table, column],
  );
  return res.rows[0]?.ok === true;
}

async function updateIfPossible(client, table, updates, whereColumn = 'tenant_id') {
  if (!(await tableExists(client, table))) return 0;
  if (!(await columnExists(client, table, whereColumn))) return 0;
  const existing = [];
  for (const column of Object.keys(updates)) {
    if (await columnExists(client, table, column)) existing.push(column);
  }
  if (!existing.length) return 0;
  const assignments = existing.map((column, index) => `"${column}" = $${index + 1}`);
  const values = existing.map((column) => updates[column]);
  const res = await client.query(
    `update public."${table}" set ${assignments.join(', ')} where "${whereColumn}" = $${existing.length + 1}`,
    [...values, tenantId],
  );
  return res.rowCount;
}

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'saas_platform',
  });
  await client.connect();
  try {
    await client.query(
      `update public.tenants set name = $1, updated_at = now() where id = $2`,
      ['Nes Grocery', tenantId],
    );
    await updateIfPossible(client, 'tenant_profiles', {
      business_name: 'Nes Grocery',
      owner_name: 'Abhijeet Sain',
    });

    const candidateTables = [
      'tenant_apps',
      'tenant_branding',
      'tenant_app_configs',
      'app_configs',
      'storefront_app_configs',
      'mobile_apps',
      'build_jobs',
    ];
    for (const table of candidateTables) {
      await updateIfPossible(client, table, {
        app_name: 'Nes Grocery',
        store_name: 'Nes Grocery',
        business_name: 'Nes Grocery',
        display_name: 'Nes Grocery',
        title: 'Nes Grocery',
        name: 'Nes Grocery',
      });
    }

    const rows = await client.query(
      `select table_name, column_name
         from information_schema.columns
        where table_schema = 'public'
          and data_type in ('character varying', 'text')
          and table_name not like 'pg_%'
        order by table_name, column_name`,
    );
    for (const row of rows.rows) {
      const table = row.table_name;
      const column = row.column_name;
      if (!(await columnExists(client, table, 'tenant_id'))) continue;
      const select = await client.query(
        `select id, "${column}" as value from public."${table}" where tenant_id = $1 and "${column}" is not null`,
        [tenantId],
      ).catch(() => ({ rows: [] }));
      for (const item of select.rows) {
        const next = fixed(item.value);
        if (next !== item.value) {
          await client.query(
            `update public."${table}" set "${column}" = $1 where id = $2`,
            [next, item.id],
          ).catch(() => undefined);
        }
      }
    }
  } catch (error) {
    throw error;
  }

  const tenant = await client.query(
    `select t.name, t.slug, p.business_name
       from tenants t
       left join tenant_profiles p on p.tenant_id = t.id
      where t.id = $1`,
    [tenantId],
  );
  console.table(tenant.rows);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
