import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckService, HealthCheck, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { AppService } from './app.service';
import { logger } from './config/logger.config';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  getHello(): string {
    logger.info('Hello endpoint accessed');
    return this.appService.getHello();
  }

  @Get('health')
  @HealthCheck()
  check() {
    logger.info('Health check requested');
    return this.health.check([
      // Base de datos
      () => this.db.pingCheck('database'),
      
      // Verificación básica de configuración
      () => Promise.resolve({
        config: {
          status: 'up',
          environment: this.configService.get('NODE_ENV'),
          version: this.configService.get('API_VERSION', 'v1'),
          features: {
            globalSearch: this.configService.get('GLOBAL_SEARCH_ENABLED', false),
            aiValidation: this.configService.get('AI_VALIDATION_ENABLED', false),
            marketplaces: {
              mercadolibre: this.configService.get('MERCADOLIBRE_ENABLED', false),
              amazon: this.configService.get('AMAZON_BUSINESS_ENABLED', false),
              falabella: this.configService.get('FALABELLA_ENABLED', false),
            }
          }
        }
      }),
    ]);
  }

  @Get('status')
  getStatus() {
    const status = {
      service: 'precios-api',
      version: this.configService.get('API_VERSION', 'v1'),
      environment: this.configService.get('NODE_ENV', 'development'),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      features: {
        globalSearch: this.configService.get('GLOBAL_SEARCH_ENABLED', false),
        deliveryEstimates: this.configService.get('DELIVERY_ESTIMATES_ENABLED', false),
        miningInsights: this.configService.get('MINING_INSIGHTS_ENABLED', false),
        aiValidation: this.configService.get('AI_VALIDATION_ENABLED', false),
      },
      marketplaces: {
        mercadolibre: this.configService.get('MERCADOLIBRE_ENABLED', false),
        amazonBusiness: this.configService.get('AMAZON_BUSINESS_ENABLED', false),
        falabella: this.configService.get('FALABELLA_ENABLED', false),
        tmall: this.configService.get('TMALL_ENABLED', false),
      },
      supportedCountries: this.configService.get('SUPPORTED_COUNTRIES', '').split(','),
    };

    logger.info('Status endpoint accessed', { status });
    return status;
  }
}
