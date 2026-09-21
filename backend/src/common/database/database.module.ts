import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { APP_ENTITIES } from '../entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        ssl: config.get<boolean>('database.ssl', false)
          ? { rejectUnauthorized: config.get<boolean>('database.sslRejectUnauthorized', true) }
          : false,
        entities: APP_ENTITIES,
        synchronize: false,
        logging: config.get<string>('env') !== 'production',
        extra: {
          connectionTimeoutMillis: config.get<number>('database.connectTimeoutMs', 10_000),
          max: config.get<number>('database.poolMax', 20),
          idleTimeoutMillis: config.get<number>('database.idleTimeoutMs', 30_000),
          statement_timeout: config.get<number>('database.statementTimeoutMs', 30_000),
        },
      }),
    }),
    TypeOrmModule.forFeature(APP_ENTITIES),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
