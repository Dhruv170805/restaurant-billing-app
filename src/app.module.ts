import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SuperAdminModule } from './superadmin/superadmin.module';

/**
 * Root Application Module for the NEXUS Control Plane.
 * Orchestrates global feature modules and environment configuration.
 */
@Module({
  imports: [
    // Global Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Domain Modules
    SuperAdminModule,
  ],
})
export class AppModule {}
