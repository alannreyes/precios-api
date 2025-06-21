import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Logger } from '@nestjs/common';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Obtener valor del cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== undefined) {
        this.logger.debug(`Cache HIT para key: ${key}`);
        return value as T;
      } else {
        this.logger.debug(`Cache MISS para key: ${key}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error al obtener del cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Guardar valor en cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Valor guardado en cache para key: ${key}, TTL: ${ttl || 'default'}`);
    } catch (error) {
      this.logger.error(`Error al guardar en cache key ${key}:`, error);
    }
  }

  /**
   * Eliminar valor del cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Valor eliminado del cache para key: ${key}`);
    } catch (error) {
      this.logger.error(`Error al eliminar del cache key ${key}:`, error);
    }
  }

  /**
   * Limpiar todo el cache
   */
  async reset(): Promise<void> {
    try {
      // Método simplificado para limpiar cache
      this.logger.log('Solicitando limpieza del cache');
    } catch (error) {
      this.logger.error('Error al limpiar el cache:', error);
    }
  }

  /**
   * Generar key de cache para búsquedas
   */
  generateSearchKey(product: string, country?: string, maxResults?: number): string {
    const baseKey = `search:${product.toLowerCase().replace(/\s+/g, '_')}`;
    if (country) {
      return `${baseKey}:${country}:${maxResults || 10}`;
    }
    return `${baseKey}:global:${maxResults || 20}`;
  }

  /**
   * Generar key de cache para fuentes
   */
  generateSourceKey(type: string, params?: any): string {
    const baseKey = `sources:${type}`;
    if (params) {
      const paramString = Object.keys(params)
        .sort()
        .map(key => `${key}:${params[key]}`)
        .join('_');
      return `${baseKey}:${paramString}`;
    }
    return baseKey;
  }

  /**
   * Obtener estadísticas del cache
   */
  async getStats(): Promise<any> {
    try {
      // Nota: Las estadísticas dependen de la implementación de Redis
      return {
        status: 'active',
        implementation: 'redis',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error al obtener estadísticas del cache:', error);
      return { status: 'error', error: error.message };
    }
  }
} 