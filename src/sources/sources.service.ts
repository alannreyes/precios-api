import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { logger } from '../config/logger.config';

export interface SourceConfig {
  id: string;
  name: string;
  baseUrl: string;
  country: string;
  type: 'marketplace' | 'b2b_specialized' | 'direct_brand' | 'distributor';
  enabled: boolean;
  priority: number;
  isOfficial: boolean;
  officialBrands?: string[];
  categories?: string[];
  shippingCountries?: string[];
  scraperConfig: {
    selectors: {
      productName?: string;
      price?: string;
      availability?: string;
      sku?: string;
      brand?: string;
      image?: string;
    };
    waitTime?: number;
    useProxy?: boolean;
    headers?: Record<string, string>;
  };
}

@Injectable()
export class SourcesService {
  private sources: Map<string, SourceConfig> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeDefaultSources();
  }

  private initializeDefaultSources() {
    logger.info('Inicializando fuentes por defecto');

    // MercadoLibre Sources (Marketplace - Prioridad 1)
    const mercadoLibreSources: SourceConfig[] = [
      {
        id: 'mercadolibre-pe',
        name: 'MercadoLibre Perú',
        baseUrl: 'https://listado.mercadolibre.com.pe',
        country: 'PE',
        type: 'marketplace',
        enabled: this.configService.get('MERCADOLIBRE_ENABLED', true),
        priority: 1,
        isOfficial: true,
        officialBrands: ['Bosch', '3M', 'Makita', 'DeWalt', 'Stanley', 'Klein Tools', 'Fluke'],
        categories: ['herramientas', 'epp', 'instrumentos', 'construccion'],
        shippingCountries: ['PE'],
        scraperConfig: {
          selectors: {
            productName: '.ui-search-item__title',
            price: '.andes-money-amount__fraction',
            availability: '.ui-search-item__stock-info',
            brand: '.ui-search-item__brand-name',
            image: '.ui-search-result-image__element img',
          },
          waitTime: 2000,
          useProxy: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        },
      },
      {
        id: 'mercadolibre-mx',
        name: 'MercadoLibre México',
        baseUrl: 'https://listado.mercadolibre.com.mx',
        country: 'MX',
        type: 'marketplace',
        enabled: this.configService.get('MERCADOLIBRE_ENABLED', true),
        priority: 1,
        isOfficial: true,
        officialBrands: ['Bosch', '3M', 'Makita', 'DeWalt', 'Stanley', 'Klein Tools'],
        categories: ['herramientas', 'epp', 'instrumentos', 'construccion'],
        shippingCountries: ['MX', 'US'],
        scraperConfig: {
          selectors: {
            productName: '.ui-search-item__title',
            price: '.andes-money-amount__fraction',
            availability: '.ui-search-item__stock-info',
            brand: '.ui-search-item__brand-name',
            image: '.ui-search-result-image__element img',
          },
          waitTime: 2000,
          useProxy: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        },
      },
    ];

    // Amazon Business Sources (Marketplace - Prioridad 1)
    const amazonSources: SourceConfig[] = [
      {
        id: 'amazon-business-us',
        name: 'Amazon Business US',
        baseUrl: 'https://www.amazon.com',
        country: 'US',
        type: 'marketplace',
        enabled: this.configService.get('AMAZON_BUSINESS_ENABLED', true),
        priority: 1,
        isOfficial: true,
        officialBrands: ['Fluke', '3M', 'Milwaukee', 'Klein Tools', 'Bosch'],
        categories: ['tools', 'safety', 'instruments', 'construction'],
        shippingCountries: ['US', 'MX', 'CA'],
        scraperConfig: {
          selectors: {
            productName: '[data-cy="title-recipe-title"]',
            price: '.a-price-whole',
            availability: '#availability span',
            brand: '#bylineInfo',
            image: '#landingImage',
          },
          waitTime: 3000,
          useProxy: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        },
      },
    ];

    // B2B Specialized Sources (Prioridad 2)
    const b2bSources: SourceConfig[] = [
      {
        id: 'efc-pe',
        name: 'EFC Perú',
        baseUrl: 'https://www.efc.com.pe',
        country: 'PE',
        type: 'b2b_specialized',
        enabled: true,
        priority: 2,
        isOfficial: false,
        categories: ['epp', 'herramientas', 'seguridad', 'industrial'],
        shippingCountries: ['PE'],
        scraperConfig: {
          selectors: {
            productName: '.product-title',
            price: '.price-current',
            availability: '.stock-status',
            brand: '.product-brand',
            image: '.product-image img',
          },
          waitTime: 2000,
          useProxy: false,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        },
      },
      {
        id: 'grainger-us',
        name: 'Grainger US',
        baseUrl: 'https://www.grainger.com',
        country: 'US',
        type: 'b2b_specialized',
        enabled: true,
        priority: 2,
        isOfficial: false,
        categories: ['industrial', 'tools', 'safety', 'maintenance'],
        shippingCountries: ['US', 'MX', 'CA'],
        scraperConfig: {
          selectors: {
            productName: '.product-title',
            price: '.pricing-price',
            availability: '.availability-info',
            brand: '.manufacturer-name',
            image: '.product-image img',
          },
          waitTime: 3000,
          useProxy: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        },
      },
    ];

    // Cargar todas las fuentes
    [...mercadoLibreSources, ...amazonSources, ...b2bSources].forEach(source => {
      this.sources.set(source.id, source);
    });

    logger.info(`Inicializadas ${this.sources.size} fuentes por defecto`, {
      sources: Array.from(this.sources.keys()),
    });
  }

  // Obtener todas las fuentes activas
  getActiveSources(): SourceConfig[] {
    return Array.from(this.sources.values()).filter(source => source.enabled);
  }

  // Obtener fuentes por país
  getSourcesByCountry(country: string): SourceConfig[] {
    return this.getActiveSources().filter(source => 
      source.country === country || 
      source.shippingCountries?.includes(country)
    );
  }

  // Obtener fuentes por tipo
  getSourcesByType(type: string): SourceConfig[] {
    return this.getActiveSources().filter(source => source.type === type);
  }

  // Obtener fuentes oficiales
  getOfficialSources(): SourceConfig[] {
    return this.getActiveSources().filter(source => source.isOfficial);
  }

  // Obtener fuentes priorizadas (ordenadas por prioridad)
  getPrioritizedSources(): SourceConfig[] {
    return this.getActiveSources().sort((a, b) => a.priority - b.priority);
  }

  // Obtener fuentes para búsqueda global
  getGlobalSources(countries?: string[]): SourceConfig[] {
    if (!countries || countries.includes('ALL')) {
      return this.getPrioritizedSources();
    }

    return this.getActiveSources().filter(source =>
      countries.includes(source.country) ||
      source.shippingCountries?.some(country => countries.includes(country))
    ).sort((a, b) => a.priority - b.priority);
  }

  // Obtener fuente por ID
  getSourceById(id: string): SourceConfig | undefined {
    return this.sources.get(id);
  }

  // Actualizar score de fuente (para auto-mantenimiento futuro)
  updateSourceScore(id: string, score: number, responseTime?: number) {
    const source = this.sources.get(id);
    if (source) {
      // Por ahora solo logging, en el futuro se guardará en BD
      logger.info(`Score actualizado para fuente ${id}`, {
        sourceId: id,
        sourceName: source.name,
        newScore: score,
        responseTime,
      });
    }
  }

  // Obtener estadísticas de fuentes
  getSourcesStats() {
    const sources = Array.from(this.sources.values());
    return {
      total: sources.length,
      active: sources.filter(s => s.enabled).length,
      byType: {
        marketplace: sources.filter(s => s.type === 'marketplace').length,
        b2b_specialized: sources.filter(s => s.type === 'b2b_specialized').length,
        direct_brand: sources.filter(s => s.type === 'direct_brand').length,
        distributor: sources.filter(s => s.type === 'distributor').length,
      },
      byCountry: sources.reduce((acc, source) => {
        acc[source.country] = (acc[source.country] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      official: sources.filter(s => s.isOfficial).length,
    };
  }
} 