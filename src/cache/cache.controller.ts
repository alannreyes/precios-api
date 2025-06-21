import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { CacheService } from './cache.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('cache')
@UseGuards(AuthGuard)
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @Get('stats')
  async getStats() {
    return {
      timestamp: new Date().toISOString(),
      cache: await this.cacheService.getStats(),
      description: 'Estadísticas del sistema de caché Redis',
    };
  }

  @Delete('clear')
  async clearCache() {
    await this.cacheService.reset();
    return {
      timestamp: new Date().toISOString(),
      message: 'Caché limpiado exitosamente',
      status: 'success',
    };
  }

  @Delete('search/:key')
  async clearSearchCache(@Param('key') key: string) {
    const searchKey = this.cacheService.generateSearchKey(key);
    await this.cacheService.del(searchKey);
    return {
      timestamp: new Date().toISOString(),
      message: `Caché de búsqueda eliminado para: ${key}`,
      key: searchKey,
      status: 'success',
    };
  }

  @Get('performance')
  async getPerformanceMetrics() {
    return {
      timestamp: new Date().toISOString(),
      metrics: {
        cacheImplementation: 'Redis',
        defaultTTL: '300 segundos (5 minutos)',
        globalSearchTTL: '600 segundos (10 minutos)',
        maxCacheSize: '1000 elementos',
        status: 'active',
      },
      description: 'Métricas de rendimiento del sistema de caché',
    };
  }
} 