import { Injectable } from '@nestjs/common';
import { logger } from '../config/logger.config';

export interface PerformanceMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  searches: {
    total: number;
    averageTime: number;
    averageResults: number;
  };
  sources: {
    activeCount: number;
    averageResponseTime: number;
  };
}

@Injectable()
export class PerformanceService {
  private metrics: PerformanceMetrics = {
    requests: {
      total: 0,
      successful: 0,
      failed: 0,
      averageResponseTime: 0,
    },
    cache: {
      hits: 0,
      misses: 0,
      hitRate: 0,
    },
    searches: {
      total: 0,
      averageTime: 0,
      averageResults: 0,
    },
    sources: {
      activeCount: 38,
      averageResponseTime: 50,
    },
  };

  private responseTimes: number[] = [];
  private searchTimes: number[] = [];
  private searchResults: number[] = [];

  /**
   * Registrar una nueva request
   */
  recordRequest(responseTime: number, successful: boolean = true): void {
    this.metrics.requests.total++;
    
    if (successful) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Mantener solo los últimos 100 tiempos de respuesta
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }

    // Calcular promedio
    this.metrics.requests.averageResponseTime = 
      this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;

    logger.debug('Request registrada', {
      responseTime,
      successful,
      totalRequests: this.metrics.requests.total,
    });
  }

  /**
   * Registrar un hit/miss de caché
   */
  recordCacheEvent(isHit: boolean): void {
    if (isHit) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }

    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total) * 100 : 0;

    logger.debug('Evento de caché registrado', {
      isHit,
      hitRate: this.metrics.cache.hitRate,
    });
  }

  /**
   * Registrar una búsqueda
   */
  recordSearch(responseTime: number, resultCount: number): void {
    this.metrics.searches.total++;

    // Mantener solo las últimas 50 búsquedas
    this.searchTimes.push(responseTime);
    this.searchResults.push(resultCount);

    if (this.searchTimes.length > 50) {
      this.searchTimes.shift();
      this.searchResults.shift();
    }

    // Calcular promedios
    this.metrics.searches.averageTime = 
      this.searchTimes.reduce((a, b) => a + b, 0) / this.searchTimes.length;
    
    this.metrics.searches.averageResults = 
      this.searchResults.reduce((a, b) => a + b, 0) / this.searchResults.length;

    logger.debug('Búsqueda registrada', {
      responseTime,
      resultCount,
      averageTime: this.metrics.searches.averageTime,
    });
  }

  /**
   * Obtener métricas actuales
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Obtener estadísticas de rendimiento
   */
  getPerformanceStats() {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    return {
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptime),
        formatted: this.formatUptime(uptime),
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB',
      },
      performance: this.getMetrics(),
      rateLimit: {
        general: '100 req/min',
        search: '30 req/min',
        sources: '50 req/min',
        premium: '200 req/min',
      },
    };
  }

  /**
   * Resetear métricas
   */
  resetMetrics(): void {
    this.metrics = {
      requests: { total: 0, successful: 0, failed: 0, averageResponseTime: 0 },
      cache: { hits: 0, misses: 0, hitRate: 0 },
      searches: { total: 0, averageTime: 0, averageResults: 0 },
      sources: { activeCount: 38, averageResponseTime: 50 },
    };
    
    this.responseTimes = [];
    this.searchTimes = [];
    this.searchResults = [];

    logger.info('Métricas de rendimiento reseteadas');
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }
} 