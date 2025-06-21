import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { logger } from '../config/logger.config';
import { SourceConfig } from '../sources/sources.service';

export interface ScrapingResult {
  sourceId: string;
  sourceName: string;
  productName: string;
  brand?: string;
  model?: string;
  sku?: string;
  price: number;
  currency: string;
  productUrl: string;
  imageUrl?: string;
  availability: 'in_stock' | 'out_of_stock' | 'limited' | 'unknown';
  stockQuantity?: number;
  isOfficialSource: boolean;
  confidenceScore: number;
  responseTimeMs: number;
  scrapedAt: Date;
  // Nuevas propiedades B2B para Fase 3
  technicalSpecs?: Record<string, string>;
  datasheetUrl?: string;
  cadFileUrl?: string;
  minimumOrderQuantity?: number;
  leadTime?: string;
  bulkPricing?: Array<{
    quantity: number;
    price: number;
    currency: string;
  }>;
  certifications?: string[];
  warranty?: string;
  manufacturerPartNumber?: string;
}

export interface SearchQuery {
  product: string;
  country?: string;
  maxResults?: number;
  officialOnly?: boolean;
}

@Injectable()
export class ScrapingService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser;
  private context: BrowserContext;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    if (this.configService.get('PLAYWRIGHT_ENABLED', false)) {
      await this.initializeBrowser();
    }
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private async initializeBrowser() {
    try {
      logger.info('Inicializando navegador Playwright');
      
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });

      this.context = await this.browser.newContext({
        userAgent: this.configService.get('USER_AGENT', 
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ),
        viewport: { width: 1366, height: 768 },
        locale: 'es-ES',
        timezoneId: 'America/Lima',
      });

      logger.info('Navegador Playwright inicializado correctamente');
    } catch (error) {
      logger.error('Error inicializando navegador Playwright', { error: error.message });
      throw error;
    }
  }

  async scrapeSource(source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    const startTime = Date.now();
    
    try {
      logger.info(`Iniciando scraping en ${source.name}`, {
        sourceId: source.id,
        query: query.product,
        country: source.country,
      });

      if (!this.browser || !this.context) {
        throw new Error('Navegador no inicializado');
      }

      const page = await this.context.newPage();
      
      try {
        // Configurar headers adicionales si están definidos
        if (source.scraperConfig.headers) {
          await page.setExtraHTTPHeaders(source.scraperConfig.headers);
        }

        // Construir URL de búsqueda según el tipo de fuente
        const searchUrl = this.buildSearchUrl(source, query.product);
        
        logger.info(`Navegando a: ${searchUrl}`);
        await page.goto(searchUrl, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });

        // Esperar tiempo configurado
        if (source.scraperConfig.waitTime) {
          await page.waitForTimeout(source.scraperConfig.waitTime);
        }

        // Scraping específico según el tipo de fuente
        let results: ScrapingResult[] = [];
        
        switch (source.type) {
          case 'marketplace':
            if (source.id.startsWith('mercadolibre')) {
              results = await this.scrapeMercadoLibre(page, source, query);
            } else if (source.id.startsWith('amazon')) {
              results = await this.scrapeAmazon(page, source, query);
            }
            break;
          case 'b2b_specialized':
            results = await this.scrapeB2BSpecialized(page, source, query);
            break;
          default:
            results = await this.scrapeGeneric(page, source, query);
        }

        const responseTime = Date.now() - startTime;
        
        // Actualizar tiempo de respuesta en todos los resultados
        results.forEach(result => {
          result.responseTimeMs = responseTime;
          result.scrapedAt = new Date();
        });

        logger.info(`Scraping completado en ${source.name}`, {
          sourceId: source.id,
          resultsCount: results.length,
          responseTimeMs: responseTime,
        });

        return results;

      } finally {
        await page.close();
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error(`Error en scraping de ${source.name}`, {
        sourceId: source.id,
        error: error.message,
        responseTimeMs: responseTime,
      });
      return [];
    }
  }

  private buildSearchUrl(source: SourceConfig, productQuery: string): string {
    const encodedQuery = encodeURIComponent(productQuery);
    
    switch (source.id) {
      // MercadoLibre
      case 'mercadolibre-pe':
      case 'mercadolibre-mx':
      case 'mercadolibre-ar':
      case 'mercadolibre-cl':
        return `${source.baseUrl}/${encodedQuery}`;
      
      // Amazon Business
      case 'amazon-business-us':
      case 'amazon-business-de':
        return `${source.baseUrl}/s?k=${encodedQuery}&ref=nb_sb_noss`;
      
      // B2B Especializadas - Fase 3
      case 'grainger-us':
      case 'grainger-us-extended':
        return `${source.baseUrl}/search?searchQuery=${encodedQuery}`;
      case 'grainger-mx':
        return `${source.baseUrl}/buscar?q=${encodedQuery}`;
      case 'rs-components-uk':
      case 'rs-components-de':
        return `${source.baseUrl}/search?searchTerm=${encodedQuery}`;
      case 'wurth-de':
        return `${source.baseUrl}/search?query=${encodedQuery}`;
      case 'wurth-us':
        return `${source.baseUrl}/search?q=${encodedQuery}`;
      case 'fastenal-us':
        return `${source.baseUrl}/products?term=${encodedQuery}`;
      case 'mcmaster-carr-us':
        return `${source.baseUrl}/search/results.html?Ntt=${encodedQuery}`;
      case 'conrad-de':
        return `${source.baseUrl}/de/search.html?search=${encodedQuery}`;
      case 'efc-pe':
      case 'efc-pe-extended':
        return `${source.baseUrl}/search?q=${encodedQuery}`;
      case 'farnell-uk':
        return `${source.baseUrl}/search?st=${encodedQuery}`;
      case 'zoro-us':
        return `${source.baseUrl}/search?q=${encodedQuery}`;
      case 'misumi-jp':
      case 'misumi-us':
        return `${source.baseUrl}/vona2/result/?Keyword=${encodedQuery}`;
      case 'rexel-fr':
        return `${source.baseUrl}/recherche?q=${encodedQuery}`;
      case 'hoffmann-group-de':
        return `${source.baseUrl}/search?query=${encodedQuery}`;
      
      default:
        return `${source.baseUrl}/search?q=${encodedQuery}`;
    }
  }

  private async scrapeMercadoLibre(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    const maxResults = query.maxResults || 10;

    try {
      // Esperar a que carguen los resultados
      await page.waitForSelector('.ui-search-results', { timeout: 10000 });

      // Obtener elementos de productos
      const productElements = await page.$$('.ui-search-result');
      
      for (let i = 0; i < Math.min(productElements.length, maxResults); i++) {
        const element = productElements[i];
        
        try {
          const productName = await element.$eval(
            source.scraperConfig.selectors.productName || '.ui-search-item__title', 
            el => el.textContent?.trim() || ''
          ).catch(() => '');

          const priceText = await element.$eval(
            source.scraperConfig.selectors.price || '.andes-money-amount__fraction',
            el => el.textContent?.trim() || ''
          ).catch(() => '');

          const productLink = await element.$eval(
            'a', 
            el => (el as HTMLAnchorElement).href || ''
          ).catch(() => '');

          const imageUrl = await element.$eval(
            source.scraperConfig.selectors.image || '.ui-search-result-image__element img',
            el => (el as HTMLImageElement).src || ''
          ).catch(() => '');

          const brandText = await element.$eval(
            source.scraperConfig.selectors.brand || '.ui-search-item__brand-name',
            el => el.textContent?.trim() || ''
          ).catch(() => '');

          if (productName && priceText && productLink) {
            // Procesar precio
            const price = this.extractPrice(priceText);
            const currency = this.extractCurrency(priceText, source.country);
            
            // Determinar si es fuente oficial
            const isOfficial = this.isOfficialProduct(productName, brandText, source);
            
            // Calcular score de confianza
            const confidenceScore = this.calculateConfidenceScore(
              productName, 
              query.product, 
              brandText, 
              isOfficial
            );

            // Solo incluir si cumple con el filtro de oficial
            if (query.officialOnly && !isOfficial) {
              continue;
            }

            results.push({
              sourceId: source.id,
              sourceName: source.name,
              productName,
              brand: brandText || undefined,
              price,
              currency,
              productUrl: productLink,
              imageUrl: imageUrl || undefined,
              availability: 'in_stock', // MercadoLibre por defecto muestra disponibles
              isOfficialSource: isOfficial,
              confidenceScore,
              responseTimeMs: 0, // Se actualizará después
              scrapedAt: new Date(),
            });
          }
        } catch (error) {
          logger.warn(`Error procesando elemento ${i} en MercadoLibre`, {
            sourceId: source.id,
            error: error.message,
          });
        }
      }

    } catch (error) {
      logger.error('Error en scraping de MercadoLibre', {
        sourceId: source.id,
        error: error.message,
      });
    }

    return results;
  }

  private async scrapeAmazon(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    // Implementación similar a MercadoLibre pero con selectores de Amazon
    // Por ahora retornamos array vacío
    logger.info('Scraping de Amazon - En desarrollo');
    return [];
  }

  private async scrapeB2BSpecialized(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    // Scraping especializado para cada fuente B2B según la Fase 3
    switch (source.id) {
      case 'grainger-us':
      case 'grainger-us-extended':
        return this.scrapeGrainger(page, source, query);
      case 'grainger-mx':
        return this.scrapeGraingerMX(page, source, query);
      case 'rs-components-uk':
      case 'rs-components-de':
        return this.scrapeRSComponents(page, source, query);
      case 'wurth-de':
      case 'wurth-us':
        return this.scrapeWurth(page, source, query);
      case 'fastenal-us':
        return this.scrapeFastenal(page, source, query);
      case 'mcmaster-carr-us':
        return this.scrapeMcMasterCarr(page, source, query);
      case 'conrad-de':
        return this.scrapeConrad(page, source, query);
      case 'efc-pe':
      case 'efc-pe-extended':
        return this.scrapeEFC(page, source, query);
      case 'farnell-uk':
        return this.scrapeFarnell(page, source, query);
      case 'zoro-us':
        return this.scrapeZoro(page, source, query);
      case 'misumi-jp':
      case 'misumi-us':
        return this.scrapeMisumi(page, source, query);
      case 'rexel-fr':
        return this.scrapeRexel(page, source, query);
      case 'hoffmann-group-de':
        return this.scrapeHoffmannGroup(page, source, query);
      default:
        return this.scrapeGenericB2B(page, source, query);
    }
  }

  // Métodos específicos para cada fuente B2B - Fase 3

  private async scrapeGrainger(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    const maxResults = query.maxResults || 10;

    try {
      // Usar selectores genéricos ya que Playwright está deshabilitado
      // Simulamos resultados B2B realistas para Grainger
      const mockResults = this.generateMockB2BResults(source, query, maxResults, {
        specialization: 'industrial_supplies',
        hasTechnicalSpecs: true,
        hasDatasheets: true,
        priceRange: [50, 500],
      });

      logger.info(`Scraping simulado de Grainger completado: ${mockResults.length} resultados`);
      return mockResults;

    } catch (error) {
      logger.error('Error en scraping de Grainger:', error.message);
      return [];
    }
  }

  private async scrapeRSComponents(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    const maxResults = query.maxResults || 10;

    try {
      // Simulamos resultados específicos para RS Components (electrónicos)
      const mockResults = this.generateMockB2BResults(source, query, maxResults, {
        specialization: 'electronics_automation',
        hasTechnicalSpecs: true,
        hasDatasheets: true,
        hasCADFiles: false,
        priceRange: [10, 200],
      });

      logger.info(`Scraping simulado de RS Components completado: ${mockResults.length} resultados`);
      return mockResults;

    } catch (error) {
      logger.error('Error en scraping de RS Components:', error.message);
      return [];
    }
  }

  private async scrapeMcMasterCarr(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    const maxResults = query.maxResults || 10;

    try {
      // McMaster-Carr es famoso por sus archivos CAD y especificaciones técnicas
      const mockResults = this.generateMockB2BResults(source, query, maxResults, {
        specialization: 'technical_components',
        hasTechnicalSpecs: true,
        hasDatasheets: true,
        hasCADFiles: true,
        priceRange: [5, 100],
      });

      logger.info(`Scraping simulado de McMaster-Carr completado: ${mockResults.length} resultados`);
      return mockResults;

    } catch (error) {
      logger.error('Error en scraping de McMaster-Carr:', error.message);
      return [];
    }
  }

  // Métodos auxiliares para otras fuentes B2B (implementación básica)
  private async scrapeGraingerMX(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    return this.generateMockB2BResults(source, query, query.maxResults || 10, {
      specialization: 'industrial_supplies',
      hasTechnicalSpecs: true,
      hasDatasheets: false,
      priceRange: [100, 1000],
    });
  }

  private async scrapeWurth(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    return this.generateMockB2BResults(source, query, query.maxResults || 10, {
      specialization: 'fasteners_tools',
      hasTechnicalSpecs: true,
      hasDatasheets: true,
      priceRange: [2, 50],
    });
  }

  private async scrapeFastenal(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    return this.generateMockB2BResults(source, query, query.maxResults || 10, {
      specialization: 'industrial_supplies',
      hasTechnicalSpecs: true,
      hasDatasheets: false,
      priceRange: [5, 200],
    });
  }

  private async scrapeConrad(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    return this.generateMockB2BResults(source, query, query.maxResults || 10, {
      specialization: 'electronics_automation',
      hasTechnicalSpecs: true,
      hasDatasheets: true,
      priceRange: [15, 300],
    });
  }

  private async scrapeEFC(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    return this.generateMockB2BResults(source, query, query.maxResults || 10, {
      specialization: 'ppe_tools',
      hasTechnicalSpecs: true,
      hasDatasheets: false,
      priceRange: [20, 150],
    });
  }

  private async scrapeFarnell(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    return this.generateMockB2BResults(source, query, query.maxResults || 10, {
      specialization: 'electronics',
      hasTechnicalSpecs: true,
      hasDatasheets: true,
      priceRange: [1, 500],
    });
  }

  private async scrapeZoro(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    return this.generateMockB2BResults(source, query, query.maxResults || 10, {
      specialization: 'industrial_supplies',
      hasTechnicalSpecs: false,
      hasDatasheets: false,
      priceRange: [10, 100],
    });
  }

  private async scrapeMisumi(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    return this.generateMockB2BResults(source, query, query.maxResults || 10, {
      specialization: 'manufacturing_components',
      hasTechnicalSpecs: true,
      hasDatasheets: true,
      hasCADFiles: true,
      priceRange: [5, 200],
    });
  }

  private async scrapeRexel(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    return this.generateMockB2BResults(source, query, query.maxResults || 10, {
      specialization: 'electrical_supplies',
      hasTechnicalSpecs: true,
      hasDatasheets: true,
      priceRange: [20, 300],
    });
  }

  private async scrapeHoffmannGroup(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    return this.generateMockB2BResults(source, query, query.maxResults || 10, {
      specialization: 'professional_tools',
      hasTechnicalSpecs: true,
      hasDatasheets: true,
      priceRange: [30, 500],
    });
  }

  // Generador de resultados mock para B2B con características específicas
  private generateMockB2BResults(
    source: SourceConfig, 
    query: SearchQuery, 
    count: number,
    options: {
      specialization: string;
      hasTechnicalSpecs: boolean;
      hasDatasheets: boolean;
      hasCADFiles?: boolean;
      priceRange: [number, number];
    }
  ): ScrapingResult[] {
    const results: ScrapingResult[] = [];
    const brands = source.officialBrands || ['Generic Brand'];
    
    for (let i = 0; i < count; i++) {
      const brand = brands[i % brands.length];
      const productName = `${query.product} ${source.country} Modelo ${i + 1}`;
      const price = Math.random() * (options.priceRange[1] - options.priceRange[0]) + options.priceRange[0];
      
      // Generar especificaciones técnicas específicas por especialización
      let technicalSpecs: Record<string, string> | undefined;
      if (options.hasTechnicalSpecs) {
        technicalSpecs = this.generateTechnicalSpecs(options.specialization);
      }

      // URLs de ejemplo para datasheets y CAD
      const datasheetUrl = options.hasDatasheets ? 
        `${source.baseUrl}/datasheets/${encodeURIComponent(productName)}.pdf` : undefined;
      
      const cadFileUrl = options.hasCADFiles ? 
        `${source.baseUrl}/cad/${encodeURIComponent(productName)}.dwg` : undefined;

      const isOfficial = this.isOfficialProduct(productName, brand, source);
      const confidenceScore = this.calculateConfidenceScore(productName, query.product, brand, isOfficial);

      results.push({
        sourceId: source.id,
        sourceName: source.name,
        productName,
        brand,
        price: Math.round(price * 100) / 100,
        currency: this.extractCurrency('', source.country),
        productUrl: `${source.baseUrl}/product/${encodeURIComponent(productName)}`,
        imageUrl: `${source.baseUrl}/images/${encodeURIComponent(productName)}.jpg`,
        availability: 'in_stock',
        isOfficialSource: isOfficial,
        confidenceScore,
        responseTimeMs: 0,
        scrapedAt: new Date(),
        technicalSpecs,
        datasheetUrl,
        cadFileUrl,
        minimumOrderQuantity: Math.floor(Math.random() * 10) + 1,
        leadTime: `${Math.floor(Math.random() * 14) + 1} días`,
        manufacturerPartNumber: `MPN-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      });
    }

    return results;
  }

  // Generar especificaciones técnicas específicas por especialización
  private generateTechnicalSpecs(specialization: string): Record<string, string> {
    const baseSpecs = {
      'Peso': `${(Math.random() * 5 + 0.1).toFixed(2)} kg`,
      'Dimensiones': `${Math.floor(Math.random() * 50 + 10)}x${Math.floor(Math.random() * 50 + 10)}x${Math.floor(Math.random() * 50 + 10)} cm`,
      'Material': 'Acero inoxidable',
    };

    switch (specialization) {
      case 'electronics_automation':
        return {
          ...baseSpecs,
          'Voltaje': `${Math.floor(Math.random() * 220 + 12)}V`,
          'Corriente': `${(Math.random() * 10 + 0.1).toFixed(2)}A`,
          'Frecuencia': '50/60 Hz',
          'Temperatura de operación': '-20°C a +70°C',
          'Grado de protección': 'IP65',
        };
      case 'industrial_supplies':
        return {
          ...baseSpecs,
          'Capacidad de carga': `${Math.floor(Math.random() * 1000 + 100)} kg`,
          'Presión máxima': `${Math.floor(Math.random() * 100 + 10)} bar`,
          'Temperatura máxima': `${Math.floor(Math.random() * 200 + 50)}°C`,
          'Certificación': 'ISO 9001',
        };
      case 'ppe_tools':
        return {
          ...baseSpecs,
          'Nivel de protección': 'EN 388',
          'Talla': 'M/L/XL',
          'Color': 'Amarillo/Negro',
          'Certificación CE': 'Sí',
          'Resistencia': 'Cortes nivel 5',
        };
      case 'fasteners_tools':
        return {
          ...baseSpecs,
          'Rosca': `M${Math.floor(Math.random() * 20 + 6)}`,
          'Longitud': `${Math.floor(Math.random() * 100 + 10)} mm`,
          'Clase de resistencia': '8.8',
          'Acabado': 'Galvanizado',
        };
      case 'technical_components':
        return {
          ...baseSpecs,
          'Tolerancia': '±0.1mm',
          'Dureza': `${Math.floor(Math.random() * 30 + 40)} HRC`,
          'Acabado superficial': 'Ra 0.8',
          'Material certificado': 'AISI 316L',
        };
      default:
        return baseSpecs;
    }
  }

  // Scraper genérico mejorado para B2B
  private async scrapeGenericB2B(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    // Implementación genérica para fuentes B2B no específicamente configuradas
    return this.generateMockB2BResults(source, query, query.maxResults || 10, {
      specialization: 'general',
      hasTechnicalSpecs: true,
      hasDatasheets: false,
      priceRange: [10, 200],
    });
  }

  private async scrapeGeneric(page: Page, source: SourceConfig, query: SearchQuery): Promise<ScrapingResult[]> {
    // Implementación genérica usando los selectores configurados
    logger.info('Scraping genérico - En desarrollo');
    return [];
  }

  private extractPrice(priceText: string): number {
    // Extraer número del texto de precio
    const cleanPrice = priceText.replace(/[^\d.,]/g, '');
    const price = parseFloat(cleanPrice.replace(',', '.'));
    return isNaN(price) ? 0 : price;
  }

  private extractCurrency(priceText: string, country: string): string {
    // Determinar moneda basada en el país y texto
    if (priceText.includes('S/') || country === 'PE') return 'PEN';
    if (priceText.includes('$') && country === 'US') return 'USD';
    if (priceText.includes('$') && country === 'MX') return 'MXN';
    if (priceText.includes('$') && country === 'AR') return 'ARS';
    if (priceText.includes('$') && country === 'CL') return 'CLP';
    if (priceText.includes('€')) return 'EUR';
    
    // Por defecto según país
    const currencyMap: Record<string, string> = {
      'PE': 'PEN',
      'US': 'USD',
      'MX': 'MXN',
      'AR': 'ARS',
      'CL': 'CLP',
      'BR': 'BRL',
      'CO': 'COP',
      'DE': 'EUR',
      'UK': 'GBP',
    };
    
    return currencyMap[country] || 'USD';
  }

  private isOfficialProduct(productName: string, brandText: string, source: SourceConfig): boolean {
    if (!source.isOfficial || !source.officialBrands) {
      return false;
    }

    const productLower = productName.toLowerCase();
    const brandLower = brandText?.toLowerCase() || '';

    return source.officialBrands.some(brand => 
      productLower.includes(brand.toLowerCase()) || 
      brandLower.includes(brand.toLowerCase())
    );
  }

  private calculateConfidenceScore(
    productName: string, 
    searchQuery: string, 
    brand: string, 
    isOfficial: boolean
  ): number {
    let score = 0;

    // Score base por coincidencia de nombre
    const productLower = productName.toLowerCase();
    const queryLower = searchQuery.toLowerCase();
    const queryWords = queryLower.split(' ');
    
    const matchingWords = queryWords.filter(word => 
      word.length > 2 && productLower.includes(word)
    );
    
    score += (matchingWords.length / queryWords.length) * 70;

    // Bonus por marca oficial
    if (isOfficial) {
      score += 20;
    }

    // Bonus por tener marca identificada
    if (brand && brand.length > 0) {
      score += 10;
    }

    return Math.min(Math.round(score), 100);
  }
} 