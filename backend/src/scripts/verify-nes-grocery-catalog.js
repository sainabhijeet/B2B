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
  const schema = 't_a9f32f9cb17a4ef5972496cd99d70c7a';
  const rows = await client.query(
    `select p.name, p.brand, p.price, p.mrp, v.moq, v.stock_quantity,
            v.attributes_json, i.image_url
       from "${schema}".products p
       join "${schema}".product_variants v on v.product_id = p.id
       join "${schema}".product_images i on i.product_id = p.id
      where p.tenant_id = $1
      order by p.created_at desc
      limit 5`,
    [tenantId],
  );
  console.table(rows.rows);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
