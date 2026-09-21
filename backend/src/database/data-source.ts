import 'dotenv/config';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { APP_ENTITIES } from '../common/entities';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME,
  entities: APP_ENTITIES,
  migrations: [join(__dirname, 'migrations/*.{ts,js}')],
  synchronize: false,
  extra: {
    connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 10000),
  },
});
