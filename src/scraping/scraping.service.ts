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
      case 'mercadolibre-pe':
        return `${source.baseUrl}/${encodedQuery}`;
      case 'mercadolibre-mx':
        return `${source.baseUrl}/${encodedQuery}`;
      case 'mercadolibre-ar':
        return `${source.baseUrl}/${encodedQuery}`;
      case 'mercadolibre-cl':
        return `${source.baseUrl}/${encodedQuery}`;
      case 'amazon-business-us':
        return `${source.baseUrl}/s?k=${encodedQuery}&ref=nb_sb_noss`;
      case 'amazon-business-de':
        return `${source.baseUrl}/s?k=${encodedQuery}&ref=nb_sb_noss`;
      case 'efc-pe':
        return `${source.baseUrl}/search?q=${encodedQuery}`;
      case 'grainger-us':
        return `${source.baseUrl}/search?searchQuery=${encodedQuery}`;
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
    // Implementación para sitios B2B especializados
    logger.info('Scraping de B2B especializado - En desarrollo');
    return [];
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