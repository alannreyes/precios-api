import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PerformanceService } from './performance.service';
import { PerformanceController } from './performance.controller';

@Module({
  imports: [
    // Rate Limiting avanzado con múltiples niveles
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        // Límite general - 100 requests por minuto
        {
          name: 'general',
          ttl: 60000,
          limit: configService.get('RATE_LIMIT_GENERAL', 100),
        },
        // Límite de búsquedas - 30 búsquedas por minuto
        {
          name: 'search',
          ttl: 60000,
          limit: configService.get('RATE_LIMIT_SEARCH', 30),
        },
        // Límite de fuentes - 50 requests por minuto
        {
          name: 'sources',
          ttl: 60000,
          limit: configService.get('RATE_LIMIT_SOURCES', 50),
        },
        // Límite premium - 200 requests por minuto para API keys premium
        {
          name: 'premium',
          ttl: 60000,
          limit: configService.get('RATE_LIMIT_PREMIUM', 200),
        },
      ],
      inject: [ConfigService],
    }),
  ],
  controllers: [PerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {} 