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
  const rows = await client.query(
    `select bj.id,
            bj.status,
            bj.package_name,
            bj.error_message,
            bj.created_at,
            av.version_name,
            av.build_number,
            av.build_status
       from build_jobs bj
       left join app_versions av on av.build_job_id = bj.id
      where bj.tenant_id = $1
      order by bj.created_at desc
      limit 8`,
    [tenantId],
  );
  console.table(
    rows.rows.map((row) => ({
      id: row.id,
      status: row.status,
      package_name: row.package_name,
      version: row.version_name,
      build: row.build_number,
      app_status: row.build_status,
      error: row.error_message,
    })),
  );
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
