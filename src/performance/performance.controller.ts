import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('performance')
@UseGuards(AuthGuard)
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get('metrics')
  getMetrics() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.performanceService.getMetrics(),
      description: 'Métricas de rendimiento en tiempo real',
    };
  }

  @Get('stats')
  getPerformanceStats() {
    return this.performanceService.getPerformanceStats();
  }

  @Post('reset')
  resetMetrics() {
    this.performanceService.resetMetrics();
    return {
      timestamp: new Date().toISOString(),
      message: 'Métricas de rendimiento reseteadas exitosamente',
      status: 'success',
    };
  }

  @Get('health')
  getHealthMetrics() {
    const stats = this.performanceService.getPerformanceStats();
    const metrics = this.performanceService.getMetrics();
    
    // Determinar estado de salud basado en métricas
    const isHealthy = 
      metrics.requests.averageResponseTime < 1000 && // Menos de 1 segundo promedio
      (metrics.requests.total === 0 || (metrics.requests.successful / metrics.requests.total) > 0.95); // 95% de éxito

    return {
      timestamp: new Date().toISOString(),
      status: isHealthy ? 'healthy' : 'warning',
      uptime: stats.uptime,
      memory: stats.memory,
      performance: {
        averageResponseTime: metrics.requests.averageResponseTime + 'ms',
        successRate: metrics.requests.total > 0 
          ? Math.round((metrics.requests.successful / metrics.requests.total) * 100) + '%'
          : '100%',
        cacheHitRate: Math.round(metrics.cache.hitRate) + '%',
        totalRequests: metrics.requests.total,
        totalSearches: metrics.searches.total,
      },
      recommendations: this.getRecommendations(metrics),
    };
  }

  @Get('phase6-progress')
  getPhase6Progress() {
    const metrics = this.performanceService.getMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      phase: 6,
      week: 25,
      title: 'Optimización y Escalabilidad',
      progress: {
        cache: {
          implemented: true,
          hitRate: Math.round(metrics.cache.hitRate) + '%',
          status: metrics.cache.hitRate > 30 ? 'excellent' : 'good',
        },
        rateLimiting: {
          implemented: true,
          levels: ['general', 'search', 'sources', 'premium'],
          status: 'active',
        },
        performance: {
          averageResponseTime: metrics.requests.averageResponseTime + 'ms',
          target: '<100ms',
          status: metrics.requests.averageResponseTime < 100 ? 'excellent' : 'good',
        },
        monitoring: {
          implemented: true,
          metricsTracked: ['requests', 'cache', 'searches', 'sources'],
          status: 'active',
        },
      },
      nextSteps: [
        'Implementar IA real (OpenAI/Gemini)',
        'Funcionalidades avanzadas',
        'Integración y APIs',
        'Testing y optimización',
      ],
    };
  }

  private getRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.requests.averageResponseTime > 500) {
      recommendations.push('Considerar optimización de consultas - tiempo de respuesta alto');
    }

    if (metrics.cache.hitRate < 30) {
      recommendations.push('Mejorar estrategia de caché - tasa de aciertos baja');
    }

    if (metrics.requests.total > 0 && (metrics.requests.successful / metrics.requests.total) < 0.95) {
      recommendations.push('Investigar errores - tasa de éxito menor al 95%');
    }

    if (recommendations.length === 0) {
      recommendations.push('Sistema funcionando óptimamente');
    }

    return recommendations;
  }
} 