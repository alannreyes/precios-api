import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { logger } from '../config/logger.config';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

export interface SourceConfig {
  id: string;
  name: string;
  baseUrl: string;
  country: string;
  type: 'marketplace' | 'b2b_specialized' | 'direct_brand' | 'distributor';
  enabled: boolean;
  priority: number;
  isOfficial: boolean;
  specialization?: string;
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
      specifications?: string;
      datasheet?: string;
      cad_files?: string;
      cad_download?: string;
    };
    waitTime?: number;
    useProxy?: boolean;
    headers?: Record<string, string>;
  };
  score?: number;
  lastChecked?: Date;
  responseTime?: number;
  successRate?: number;
}

@Injectable()
export class SourcesService {
  private sources: Map<string, SourceConfig> = new Map();
  private b2bConfig: any;

  constructor(private readonly configService: ConfigService) {
    this.loadB2BConfig();
    this.initializeDefaultSources();
    this.loadAdditionalSources();
  }

  private loadB2BConfig() {
    try {
      const configPath = path.join(process.cwd(), 'config', 'sources.yaml');
      const configFile = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(configFile) as any;
      this.b2bConfig = config.b2b_config || {};
      logger.info('Configuración B2B cargada exitosamente');
    } catch (error) {
      logger.warn('No se pudo cargar configuración B2B, usando valores por defecto');
      this.b2bConfig = {
        enable_technical_specs: true,
        enable_bulk_pricing: true,
        enable_datasheet_extraction: true,
        enable_cad_file_detection: true,
        minimum_order_quantity_detection: true,
        lead_time_extraction: true
      };
    }
  }

  private loadAdditionalSources() {
    try {
      const configPath = path.join(process.cwd(), 'config', 'sources.yaml');
      const configFile = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(configFile) as any;
      
      if (config.additional_sources && Array.isArray(config.additional_sources)) {
        config.additional_sources.forEach((source: SourceConfig) => {
          if (source.enabled) {
            this.sources.set(source.id, {
              ...source,
              score: 1.0,
              lastChecked: new Date(),
              responseTime: 0,
              successRate: 1.0
            });
          }
        });
        
        logger.info(`Cargadas ${config.additional_sources.length} fuentes adicionales desde configuración`);
      }
    } catch (error) {
      logger.warn('No se pudieron cargar fuentes adicionales:', error.message);
    }
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
        score: 1.0,
        lastChecked: new Date(),
        responseTime: 0,
        successRate: 1.0,
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
        score: 1.0,
        lastChecked: new Date(),
        responseTime: 0,
        successRate: 1.0,
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
        score: 1.0,
        lastChecked: new Date(),
        responseTime: 0,
        successRate: 1.0,
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
        specialization: 'ppe_tools',
        categories: ['epp', 'herramientas', 'seguridad', 'industrial'],
        shippingCountries: ['PE'],
        scraperConfig: {
          selectors: {
            productName: '.product-title',
            price: '.price-current',
            availability: '.stock-status',
            brand: '.product-brand',
            image: '.product-image img',
            specifications: '.product-specs',
          },
          waitTime: 2000,
          useProxy: false,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        },
        score: 1.0,
        lastChecked: new Date(),
        responseTime: 0,
        successRate: 1.0,
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
        specialization: 'industrial_supplies',
        categories: ['industrial', 'tools', 'safety', 'maintenance'],
        shippingCountries: ['US', 'MX', 'CA'],
        scraperConfig: {
          selectors: {
            productName: '.product-title',
            price: '.pricing-price',
            availability: '.availability-info',
            brand: '.manufacturer-name',
            image: '.product-image img',
            specifications: '.product-specifications',
            datasheet: '.datasheet-link',
          },
          waitTime: 3000,
          useProxy: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        },
        score: 1.0,
        lastChecked: new Date(),
        responseTime: 0,
        successRate: 1.0,
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
      (source.shippingCountries && source.shippingCountries.includes(country))
    );
  }

  // Obtener fuentes por tipo
  getSourcesByType(type: string): SourceConfig[] {
    return this.getActiveSources().filter(source => source.type === type);
  }

  // NUEVOS MÉTODOS PARA FASE 3: B2B ESPECIALIZADAS

  // Obtener fuentes B2B especializadas
  getB2BSpecializedSources(): SourceConfig[] {
    return this.getActiveSources().filter(source => source.type === 'b2b_specialized');
  }

  // Obtener fuentes por especialización B2B
  getSourcesBySpecialization(specialization: string): SourceConfig[] {
    return this.getB2BSpecializedSources().filter(source => 
      source.specialization === specialization
    );
  }

  // Obtener fuentes que soportan especificaciones técnicas
  getSourcesWithTechnicalSpecs(): SourceConfig[] {
    return this.getActiveSources().filter(source => 
      source.scraperConfig.selectors.specifications ||
      source.scraperConfig.selectors.datasheet ||
      source.scraperConfig.selectors.cad_files ||
      source.scraperConfig.selectors.cad_download
    );
  }

  // Obtener fuentes por marca oficial para B2B
  getB2BSourcesByBrand(brand: string): SourceConfig[] {
    return this.getB2BSpecializedSources().filter(source =>
      source.officialBrands && source.officialBrands.includes(brand)
    );
  }

  // Obtener fuentes con capacidades específicas B2B
  getSourcesWithCapability(capability: string): SourceConfig[] {
    const capabilityMap = {
      'technical_specs': (source: SourceConfig) => !!source.scraperConfig.selectors.specifications,
      'datasheets': (source: SourceConfig) => !!source.scraperConfig.selectors.datasheet,
      'cad_files': (source: SourceConfig) => !!source.scraperConfig.selectors.cad_files || !!source.scraperConfig.selectors.cad_download,
      'bulk_pricing': (source: SourceConfig) => source.type === 'b2b_specialized',
    };

    const checkCapability = capabilityMap[capability];
    if (!checkCapability) return [];

    return this.getActiveSources().filter(checkCapability);
  }

  // Obtener mejores fuentes B2B por país y especialización
  getBestB2BSourcesForCountry(country: string, specialization?: string): SourceConfig[] {
    let sources = this.getSourcesByCountry(country).filter(source => 
      source.type === 'b2b_specialized'
    );

    if (specialization) {
      sources = sources.filter(source => source.specialization === specialization);
    }

    return sources.sort((a, b) => {
      // Ordenar por score, luego por prioridad
      const scoreA = (a.score || 1.0) + (a.priority === 1 ? 0.2 : 0);
      const scoreB = (b.score || 1.0) + (b.priority === 1 ? 0.2 : 0);
      return scoreB - scoreA;
    });
  }

  // Obtener fuentes oficiales
  getOfficialSources(): SourceConfig[] {
    return this.getActiveSources().filter(source => source.isOfficial);
  }

  // Obtener fuentes priorizadas
  getPrioritizedSources(): SourceConfig[] {
    return this.getActiveSources().sort((a, b) => {
      const scoreA = (a.score || 1.0) * (3 - a.priority);
      const scoreB = (b.score || 1.0) * (3 - b.priority);
      return scoreB - scoreA;
    });
  }

  // Obtener fuentes globales
  getGlobalSources(countries?: string[]): SourceConfig[] {
    if (!countries || countries.length === 0) {
      return this.getActiveSources();
    }

    return this.getActiveSources().filter(source =>
      countries.includes(source.country) ||
      (source.shippingCountries && source.shippingCountries.some(c => countries.includes(c)))
    );
  }

  // Obtener fuente por ID
  getSourceById(id: string): SourceConfig | undefined {
    return this.sources.get(id);
  }

  // Actualizar score de fuente
  updateSourceScore(id: string, score: number, responseTime?: number) {
    const source = this.sources.get(id);
    if (source) {
      source.score = Math.max(0, Math.min(1, score));
      source.lastChecked = new Date();
      if (responseTime !== undefined) {
        source.responseTime = responseTime;
      }
      
      logger.debug(`Score actualizado para fuente ${id}: ${score}`, {
        sourceId: id,
        newScore: score,
        responseTime,
      });
    }
  }

  // Obtener estadísticas de fuentes
  getSourcesStats() {
    const sources = this.getActiveSources();
    const total = sources.length;
    const byType = sources.reduce((acc, source) => {
      acc[source.type] = (acc[source.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCountry = sources.reduce((acc, source) => {
      acc[source.country] = (acc[source.country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Estadísticas específicas B2B
    const b2bSources = this.getB2BSpecializedSources();
    const bySpecialization = b2bSources.reduce((acc, source) => {
      if (source.specialization) {
        acc[source.specialization] = (acc[source.specialization] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const withTechnicalSpecs = this.getSourcesWithTechnicalSpecs().length;
    const withDatasheets = this.getSourcesWithCapability('datasheets').length;
    const withCADFiles = this.getSourcesWithCapability('cad_files').length;

    return {
      total,
      active: total,
      byType,
      byCountry,
      b2b: {
        total: b2bSources.length,
        bySpecialization,
        capabilities: {
          technicalSpecs: withTechnicalSpecs,
          datasheets: withDatasheets,
          cadFiles: withCADFiles,
        }
      },
      avgScore: sources.reduce((sum, s) => sum + (s.score || 1.0), 0) / total,
    };
  }

  // Obtener configuración B2B
  getB2BConfig() {
    return this.b2bConfig;
  }

  // Recargar fuentes desde configuración
  async reloadSources() {
    this.sources.clear();
    this.loadB2BConfig();
    this.initializeDefaultSources();
    this.loadAdditionalSources();
    logger.info('Fuentes recargadas exitosamente');
  }
} 