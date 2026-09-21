import cookieParser = require('cookie-parser');
import * as express from 'express';
import * as path from 'node:path';
import helmet from 'helmet';
import { getBackendStorageRoot, logActiveStorageRoot, warnIfSplitThemeTrees } from './common/utils/storage-root';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const configService = app.get(ConfigService);

  warnIfSplitThemeTrees();
  if (process.env.NODE_ENV !== 'production') logActiveStorageRoot();
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  const publicStorageRoot = getBackendStorageRoot();
  const publicAssetDirectories = ['themes', 'grocery-catalog', 'tenant-media', 'theme-preview'];
  for (const directory of publicAssetDirectories) {
    app.useStaticAssets(path.join(publicStorageRoot, directory), {
      prefix: `/storage/${directory}/`,
      maxAge: process.env.NODE_ENV === 'production' ? 86_400_000 : 0,
      immutable: process.env.NODE_ENV === 'production',
    });
  }
  app.use(cookieParser());
  // Branding wizard can send logo data URLs; raise parser limits above Express defaults.
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  const apiPrefix = configService.get<string>('apiPrefix', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  const corsOrigins = configService.get<string[]>('cors.origins', []);
  const allowedOrigins = new Set(corsOrigins);
  app.enableCors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS'), false);
    },
    credentials: true,
  });

  if (configService.get<boolean>('swagger.enabled', false)) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SaaS Platform API')
      .setDescription('Multi-tenant B2B SaaS platform APIs')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          in: 'header',
        },
        'bearer',
      )
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: false,
      },
    });
  }

  const port = configService.get<number>('port', 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
}
bootstrap();
