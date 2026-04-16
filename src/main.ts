import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '@/src/app.module';
import { logger } from '@/lib/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'], // Optimized for platform control
  });

  // Global prefixes and versioning
  app.setGlobalPrefix('api');
  
  // Security & Validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: '*', // We'll restrict this to HQ_SUBDOMAIN in production
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.SUPERADMIN_PORT || 4000;
  await app.listen(port);
  
  logger.info(`🚀 NEXUS COMMAND Control Plane active on port ${port}`);
}

bootstrap();
