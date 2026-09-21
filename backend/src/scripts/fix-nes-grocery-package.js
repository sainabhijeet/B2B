const { Client } = require('../../node_modules/pg');

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'saas_platform',
  });
  await client.connect();
  const tenantId = 'a9f32f9c-b17a-4ef5-9724-96cd99d70c7a';
  const correctPackage = 'co.cube.nesgrocery';
  const wrongPackage = 'co.cube.nesgrocwery';
  await client.query(
    `update tenant_apps set package_name = $1 where tenant_id = $2 and package_name = $3`,
    [correctPackage, tenantId, wrongPackage],
  );
  await client.query(
    `update build_jobs set package_name = $1 where tenant_id = $2 and package_name = $3`,
    [correctPackage, tenantId, wrongPackage],
  );
  const rows = await client.query(
    `select app_name, package_name from tenant_apps where tenant_id = $1`,
    [tenantId],
  );
  console.table(rows.rows);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
