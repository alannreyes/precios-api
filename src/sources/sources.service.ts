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
  type: 'marketplace' | 'b2b_specialized' | 'direct_brand' | 'distributor' | 'brand_direct' | 'retail_specialized' | 'marketplace_asia' | 'b2b_asia';
  enabled: boolean;
  priority: number;
  isOfficial: boolean;
  specialization?: string;
  officialBrands?: string[];
  categories?: string[];
  shippingCountries?: string[];
  capabilities?: string[];
  languages?: string[];
  currency?: string;
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
      warranty?: string;
      partNumber?: string;
      software?: string;
      calibration?: string;
      msds?: string;
      certifications?: string;
      cad?: string;
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

  // =============================================================================
  // NUEVOS MÉTODOS PARA FASE 4: TIENDAS DIRECTAS + EXPANSIÓN EUROPEA
  // =============================================================================

  // Obtener tiendas directas de marca
  getBrandDirectSources(): SourceConfig[] {
    return this.getActiveSources().filter(source => source.type === 'brand_direct');
  }

  // Obtener tiendas directas por marca específica
  getBrandDirectSourcesByBrand(brand: string): SourceConfig[] {
    return this.getBrandDirectSources().filter(source =>
      source.officialBrands && source.officialBrands.some(b => 
        b.toLowerCase().includes(brand.toLowerCase())
      )
    );
  }

  // Obtener fuentes con capacidades específicas de marca
  getBrandSourcesWithCapability(capability: string): SourceConfig[] {
    const capabilityMap = {
      'warranty_info': (source: SourceConfig) => !!source.scraperConfig.selectors.warranty,
      'official_parts': (source: SourceConfig) => !!source.scraperConfig.selectors.partNumber,
      'service_centers': (source: SourceConfig) => source.type === 'brand_direct',
      'training_materials': (source: SourceConfig) => source.type === 'brand_direct',
      'software_downloads': (source: SourceConfig) => !!source.scraperConfig.selectors.software,
      'calibration_certificates': (source: SourceConfig) => !!source.scraperConfig.selectors.calibration,
      'msds_sheets': (source: SourceConfig) => !!source.scraperConfig.selectors.msds,
      'certification_docs': (source: SourceConfig) => !!source.scraperConfig.selectors.certifications,
      'cad_drawings': (source: SourceConfig) => !!source.scraperConfig.selectors.cad,
      'calculation_software': (source: SourceConfig) => !!source.scraperConfig.selectors.software,
    };

    const checkCapability = capabilityMap[capability];
    if (!checkCapability) return [];

    return this.getBrandDirectSources().filter(checkCapability);
  }

  // Obtener fuentes europeas por país
  getEuropeanSourcesByCountry(country: string): SourceConfig[] {
    const europeanCountries = ['ES', 'IT', 'FR', 'NL', 'DE', 'AT', 'CH', 'BE', 'LU', 'PT'];
    
    if (!europeanCountries.includes(country)) {
      return [];
    }

    return this.getSourcesByCountry(country);
  }

  // Obtener todas las fuentes europeas
  getAllEuropeanSources(): SourceConfig[] {
    const europeanCountries = ['ES', 'IT', 'FR', 'NL', 'DE', 'AT', 'CH', 'BE', 'LU', 'PT'];
    
    return this.getActiveSources().filter(source =>
      europeanCountries.includes(source.country) ||
      (source.shippingCountries && source.shippingCountries.some(c => europeanCountries.includes(c)))
    );
  }

  // Obtener fuentes retail especializadas
  getRetailSpecializedSources(): SourceConfig[] {
    return this.getActiveSources().filter(source => source.type === 'retail_specialized');
  }

  // Obtener fuentes retail por país europeo
  getRetailSourcesByEuropeanCountry(country: string): SourceConfig[] {
    return this.getRetailSpecializedSources().filter(source =>
      source.country === country ||
      (source.shippingCountries && source.shippingCountries.includes(country))
    );
  }

  // Obtener mejores fuentes por región europea
  getBestSourcesByEuropeanRegion(countries: string[]): SourceConfig[] {
    const sources = this.getActiveSources().filter(source =>
      countries.includes(source.country) ||
      (source.shippingCountries && source.shippingCountries.some(c => countries.includes(c)))
    );

    return sources.sort((a, b) => {
      // Priorizar fuentes oficiales y B2B especializadas
      const scoreA = (a.score || 1.0) + 
                    (a.isOfficial ? 0.3 : 0) + 
                    (a.type === 'b2b_specialized' ? 0.2 : 0) +
                    (a.type === 'brand_direct' ? 0.25 : 0) +
                    (a.priority === 1 ? 0.15 : 0);
      
      const scoreB = (b.score || 1.0) + 
                    (b.isOfficial ? 0.3 : 0) + 
                    (b.type === 'b2b_specialized' ? 0.2 : 0) +
                    (b.type === 'brand_direct' ? 0.25 : 0) +
                    (b.priority === 1 ? 0.15 : 0);
      
      return scoreB - scoreA;
    });
  }

  // Obtener fuentes con soporte multiidioma
  getMultiLanguageSources(): SourceConfig[] {
    return this.getAllEuropeanSources().filter(source => {
      // Fuentes que típicamente soportan múltiples idiomas
      const multiLangSources = [
        'bosch-professional-global',
        'hilti-direct-global',
        'conrad-',
        'rs-components-',
        'wurth-',
        'rexel-'
      ];
      
      return multiLangSources.some(prefix => source.id.startsWith(prefix));
    });
  }

  // Obtener fuentes con envío internacional
  getInternationalShippingSources(): SourceConfig[] {
    return this.getActiveSources().filter(source =>
      source.shippingCountries && source.shippingCountries.length > 2
    );
  }

  // Obtener estadísticas de la Fase 4
  getPhase4Stats() {
    const brandDirectSources = this.getBrandDirectSources();
    const europeanSources = this.getAllEuropeanSources();
    const retailSources = this.getRetailSpecializedSources();

    const brandDirectByCountry = brandDirectSources.reduce((acc, source) => {
      acc[source.country] = (acc[source.country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const europeanByCountry = europeanSources.reduce((acc, source) => {
      acc[source.country] = (acc[source.country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const brandDirectBySpecialization = brandDirectSources.reduce((acc, source) => {
      if (source.specialization) {
        acc[source.specialization] = (acc[source.specialization] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      brandDirect: {
        total: brandDirectSources.length,
        byCountry: brandDirectByCountry,
        bySpecialization: brandDirectBySpecialization,
        capabilities: {
          warrantyInfo: this.getBrandSourcesWithCapability('warranty_info').length,
          officialParts: this.getBrandSourcesWithCapability('official_parts').length,
          serviceCenters: this.getBrandSourcesWithCapability('service_centers').length,
          trainingMaterials: this.getBrandSourcesWithCapability('training_materials').length,
          softwareDownloads: this.getBrandSourcesWithCapability('software_downloads').length,
          calibrationCerts: this.getBrandSourcesWithCapability('calibration_certificates').length,
          msdsSheets: this.getBrandSourcesWithCapability('msds_sheets').length,
          certificationDocs: this.getBrandSourcesWithCapability('certification_docs').length,
          cadDrawings: this.getBrandSourcesWithCapability('cad_drawings').length,
        }
      },
      european: {
        total: europeanSources.length,
        byCountry: europeanByCountry,
        retail: retailSources.length,
        multiLanguage: this.getMultiLanguageSources().length,
        internationalShipping: this.getInternationalShippingSources().length,
      }
    };
  }

  // Obtener fuentes recomendadas para un producto específico
  getRecommendedSourcesForProduct(productType: string, country?: string, brand?: string): SourceConfig[] {
    let sources = this.getActiveSources();

    // Filtrar por país si se especifica
    if (country) {
      sources = sources.filter(source =>
        source.country === country ||
        (source.shippingCountries && source.shippingCountries.includes(country))
      );
    }

    // Filtrar por marca si se especifica
    if (brand) {
      sources = sources.filter(source =>
        !source.officialBrands || source.officialBrands.some(b => 
          b.toLowerCase().includes(brand.toLowerCase())
        )
      );
    }

    // Mapeo de tipos de producto a especializaciones
    const productSpecializationMap: Record<string, string[]> = {
      'power_tools': ['power_tools', 'construction_tools'],
      'hand_tools': ['power_tools', 'construction_tools', 'professional_tools'],
      'measuring_tools': ['test_measurement', 'electronics_automation'],
      'safety_equipment': ['ppe_industrial', 'ppe_tools'],
      'electrical_tools': ['electrical_tools', 'electronics_automation'],
      'industrial_supplies': ['industrial_supplies', 'fasteners_tools'],
      'electronics': ['electronics_automation', 'electronics'],
      'construction': ['construction_tools', 'fasteners_tools'],
    };

    const relevantSpecializations = productSpecializationMap[productType] || [];

    // Priorizar fuentes relevantes
    return sources.sort((a, b) => {
      let scoreA = a.score || 1.0;
      let scoreB = b.score || 1.0;

      // Bonus por tipo de fuente
      if (a.type === 'brand_direct') scoreA += 0.3;
      if (b.type === 'brand_direct') scoreB += 0.3;
      
      if (a.type === 'b2b_specialized') scoreA += 0.2;
      if (b.type === 'b2b_specialized') scoreB += 0.2;

      // Bonus por especialización relevante
      if (a.specialization && relevantSpecializations.includes(a.specialization)) scoreA += 0.25;
      if (b.specialization && relevantSpecializations.includes(b.specialization)) scoreB += 0.25;

      // Bonus por fuente oficial
      if (a.isOfficial) scoreA += 0.15;
      if (b.isOfficial) scoreB += 0.15;

      // Bonus por prioridad
      if (a.priority === 1) scoreA += 0.1;
      if (b.priority === 1) scoreB += 0.1;

      return scoreB - scoreA;
    });
  }

  // ====================================
  // FASE 5: MERCADOS MANUFACTUREROS + ASIA
  // ====================================

  /**
   * Obtener todas las fuentes asiáticas
   */
  getAsianSources(): SourceConfig[] {
    const asianCountries = ['CN', 'JP', 'KR', 'TW', 'SG', 'MY', 'TH', 'VN', 'ID', 'PH'];
    return this.getActiveSources().filter(source => 
      asianCountries.includes(source.country)
    );
  }

  /**
   * Obtener fuentes asiáticas por país
   */
  getAsianSourcesByCountry(country: string): SourceConfig[] {
    const asianCountries = ['CN', 'JP', 'KR', 'TW', 'SG', 'MY', 'TH', 'VN', 'ID', 'PH'];
    if (!asianCountries.includes(country.toUpperCase())) {
      return [];
    }
    return this.getSourcesByCountry(country);
  }

  /**
   * Obtener fuentes de mercados manufactureros
   */
  getManufacturingMarketSources(): SourceConfig[] {
    return this.getActiveSources().filter(source => 
      source.type === 'marketplace_asia' || 
      source.type === 'b2b_asia' ||
      source.specialization?.includes('manufacturing') ||
      source.capabilities?.includes('manufacturer_direct') ||
      source.capabilities?.includes('oem_products')
    );
  }

  /**
   * Obtener fuentes B2B asiáticas
   */
  getAsianB2BSources(): SourceConfig[] {
    return this.getActiveSources().filter(source => 
      source.type === 'b2b_asia' || 
      (source.type === 'marketplace_asia' && source.capabilities?.includes('bulk_pricing'))
    );
  }

  /**
   * Obtener fuentes con capacidades OEM/ODM
   */
  getOEMCapableSources(): SourceConfig[] {
    return this.getActiveSources().filter(source => 
      source.capabilities?.includes('oem_products') ||
      source.capabilities?.includes('oem_odm') ||
      source.capabilities?.includes('custom_manufacturing')
    );
  }

  /**
   * Obtener fuentes con envío regional asiático
   */
  getAsianRegionalShippingSources(): SourceConfig[] {
    return this.getActiveSources().filter(source => {
      const asianCountries = ['CN', 'JP', 'KR', 'TW', 'SG', 'MY', 'TH', 'VN', 'ID', 'PH'];
      return source.shippingCountries && 
        source.shippingCountries.some(country => asianCountries.includes(country)) &&
        source.shippingCountries.length >= 3; // Al menos 3 países asiáticos
    });
  }

  /**
   * Obtener fuentes por especialización manufacturera
   */
  getSourcesByManufacturingSpecialization(specialization: string): SourceConfig[] {
    const manufacturingSpecs = [
      'electronics_manufacturing',
      'manufacturing_components', 
      'electronics_automation',
      'electronics_components',
      'industrial_supplies',
      'office_industrial'
    ];
    
    if (!manufacturingSpecs.includes(specialization)) {
      return [];
    }
    
    return this.getActiveSources().filter(source => 
      source.specialization === specialization
    );
  }

  /**
   * Obtener mejores fuentes asiáticas por score
   */
  getBestAsianSources(limit: number = 10): SourceConfig[] {
    return this.getAsianSources()
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);
  }

  /**
   * Obtener fuentes con soporte multiidioma asiático
   */
  getAsianMultiLanguageSources(): SourceConfig[] {
    return this.getAsianSources().filter(source => 
      source.languages && source.languages.length >= 2
    );
  }

  /**
   * Obtener fuentes oficiales asiáticas
   */
  getOfficialAsianSources(): SourceConfig[] {
    return this.getAsianSources().filter(source => source.isOfficial);
  }

  /**
   * Obtener fuentes por hub regional (Singapur, Hong Kong)
   */
  getRegionalHubSources(): SourceConfig[] {
    return this.getActiveSources().filter(source => 
      ['SG', 'HK'].includes(source.country) ||
      source.capabilities?.includes('regional_shipping')
    );
  }

  /**
   * Análisis de cobertura asiática
   */
  getAsianCoverageAnalysis(): any {
    const asianSources = this.getAsianSources();
    const countries = [...new Set(asianSources.map(s => s.country))];
    const currencies = [...new Set(asianSources.map(s => s.currency))];
    const languages = [...new Set(asianSources.flatMap(s => s.languages || []))];
    
    return {
      totalSources: asianSources.length,
      countries: countries.sort(),
      currencies: currencies.sort(), 
      languages: languages.sort(),
      manufacturingSources: this.getManufacturingMarketSources().length,
      b2bSources: this.getAsianB2BSources().length,
      oemCapableSources: this.getOEMCapableSources().length,
      regionalShippingSources: this.getAsianRegionalShippingSources().length,
      averageScore: Math.round(asianSources.reduce((sum, s) => sum + (s.score || 0), 0) / asianSources.length),
      topCountries: this.getTopAsianCountriesBySourceCount()
    };
  }

  /**
   * Obtener top países asiáticos por cantidad de fuentes
   */
  private getTopAsianCountriesBySourceCount(): any[] {
    const asianSources = this.getAsianSources();
    const countryCount = asianSources.reduce((acc, source) => {
      acc[source.country] = (acc[source.country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(countryCount)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calcular costo estimado de envío asiático
   */
  calculateAsianShippingCost(fromCountry: string, toCountry: string, weight: number = 1): any {
    const shippingRates = {
      'CN': { base: 15, perKg: 8 },
      'JP': { base: 25, perKg: 12 },
      'KR': { base: 20, perKg: 10 },
      'TW': { base: 18, perKg: 9 },
      'SG': { base: 22, perKg: 11 },
      'MY': { base: 16, perKg: 8 },
      'TH': { base: 14, perKg: 7 },
      'VN': { base: 12, perKg: 6 },
      'ID': { base: 13, perKg: 7 },
      'PH': { base: 15, perKg: 8 }
    };
    
    const fromRate = shippingRates[fromCountry] || { base: 20, perKg: 10 };
    const baseCost = fromRate.base + (fromRate.perKg * weight);
    
    // Factor de distancia regional
    const regionalFactor = this.getRegionalShippingFactor(fromCountry, toCountry);
    
    return {
      baseCost,
      regionalFactor,
      estimatedCost: Math.round(baseCost * regionalFactor),
      currency: 'USD',
      estimatedDays: this.getEstimatedShippingDays(fromCountry, toCountry)
    };
  }

  /**
   * Factor de envío regional
   */
  private getRegionalShippingFactor(from: string, to: string): number {
    const regions = {
      'northeast': ['CN', 'JP', 'KR', 'TW'],
      'southeast': ['SG', 'MY', 'TH', 'VN', 'ID', 'PH']
    };
    
    const fromRegion = Object.keys(regions).find(region => 
      regions[region].includes(from)
    );
    const toRegion = Object.keys(regions).find(region => 
      regions[region].includes(to)
    );
    
    if (fromRegion === toRegion) return 1.0; // Misma región
    if (fromRegion && toRegion) return 1.3; // Entre regiones asiáticas
    return 1.8; // Fuera de Asia
  }

  /**
   * Días estimados de envío
   */
  private getEstimatedShippingDays(from: string, to: string): string {
    const factor = this.getRegionalShippingFactor(from, to);
    if (factor === 1.0) return '3-5 días';
    if (factor === 1.3) return '5-8 días';
    return '10-15 días';
  }

  /**
   * Recomendaciones inteligentes para productos asiáticos
   */
  getAsianProductRecommendations(product: string, targetCountry: string): any {
    const asianSources = this.getAsianSources();
    const manufacturingSources = this.getManufacturingMarketSources();
    
    // Lógica de recomendación basada en producto
    let recommendedSources: SourceConfig[] = [];
    
    if (product.toLowerCase().includes('electronic') || 
        product.toLowerCase().includes('component')) {
      recommendedSources = asianSources.filter(s => 
        s.specialization?.includes('electronics') ||
        s.capabilities?.includes('electronics_components')
      );
    } else if (product.toLowerCase().includes('industrial') ||
               product.toLowerCase().includes('automation')) {
      recommendedSources = asianSources.filter(s => 
        s.specialization?.includes('industrial') ||
        s.capabilities?.includes('automation_systems')
      );
    } else {
      recommendedSources = manufacturingSources;
    }
    
    // Priorizar fuentes que envían al país objetivo
    const shippingCapable = recommendedSources.filter(s => 
      s.shippingCountries?.includes(targetCountry) || s.country === targetCountry
    );
    
    return {
      totalRecommended: recommendedSources.length,
      shippingCapable: shippingCapable.length,
             topRecommendations: shippingCapable
         .sort((a, b) => (b.score || 0) - (a.score || 0))
         .slice(0, 5)
        .map(source => ({
          id: source.id,
          name: source.name,
          country: source.country,
          score: source.score,
          specialization: source.specialization,
          shippingCost: this.calculateAsianShippingCost(source.country, targetCountry),
          capabilities: source.capabilities?.slice(0, 3) || []
        }))
    };
  }

  /**
   * Estadísticas específicas de Fase 5
   */
  getPhase5Stats(): any {
    const phase5Types = ['marketplace_asia', 'b2b_asia'];
    const phase5Sources = this.getActiveSources().filter(source => 
      phase5Types.includes(source.type)
    );
    
    return {
      phase: 5,
      name: "Mercados Manufactureros + Asia",
      totalSources: phase5Sources.length,
      asianCoverage: this.getAsianCoverageAnalysis(),
      manufacturingCapability: {
        oemSources: this.getOEMCapableSources().length,
        b2bSources: this.getAsianB2BSources().length,
        regionalShipping: this.getAsianRegionalShippingSources().length
      },
             topPerformers: phase5Sources
         .sort((a, b) => (b.score || 0) - (a.score || 0))
         .slice(0, 5)
        .map(s => ({ name: s.name, country: s.country, score: s.score }))
    };
  }
} 