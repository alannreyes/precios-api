import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SourcesService } from '../sources/sources.service';
import { ScrapingService, ScrapingResult, SearchQuery } from '../scraping/scraping.service';
import { AIService, ProductValidationRequest } from '../ai/ai.service';
import { logger } from '../config/logger.config';

export interface SearchRequest {
  product: string;
  country?: string;
  countries?: string[]; // Para búsqueda global
  maxResults?: number;
  alternatives?: boolean;
  officialOnly?: boolean;
}

export interface GlobalAnalysis {
  bestPrice: {
    country: string;
    source: string;
    price: number;
    currency: string;
    productUrl: string;
  } | null;
  bestTotalCost: {
    country: string;
    source: string;
    totalCost: number;
    deliveryDays: number;
  } | null;
  localAvailability: ScrapingResult[];
  strategicRecommendation: string;
  savingsAnalysis: {
    maxSavings: number;
    recommendedAction: string;
  };
}

export interface SearchResponse {
  query: SearchRequest;
  isGlobalSearch: boolean;
  totalSources: number;
  totalResults: number;
  responseTimeMs: number;
  results: ScrapingResult[];
  globalAnalysis?: GlobalAnalysis;
  timestamp: Date;
}

@Injectable()
export class SearchService {
  constructor(
    private readonly sourcesService: SourcesService,
    private readonly scrapingService: ScrapingService,
    private readonly aiService: AIService,
    private readonly configService: ConfigService,
  ) {}

  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    
    logger.info('Iniciando búsqueda', {
      product: request.product,
      country: request.country,
      countries: request.countries,
      globalSearch: !!request.countries,
    });

    try {
      // Determinar si es búsqueda global
      const isGlobalSearch = !!request.countries && request.countries.length > 0;
      
      // Obtener fuentes relevantes
      const sources = isGlobalSearch 
        ? this.sourcesService.getGlobalSources(request.countries)
        : this.sourcesService.getSourcesByCountry(request.country || 'PE');

      logger.info(`Fuentes seleccionadas: ${sources.length}`, {
        sourceIds: sources.map(s => s.id),
        isGlobalSearch,
      });

      // Realizar scraping real en todas las fuentes
      const allResults: ScrapingResult[] = [];
      
      // Ejecutar scraping en paralelo para mejor rendimiento
      const scrapingPromises = sources.map(async (source) => {
        try {
          logger.info(`🔍 Iniciando scraping en fuente: ${source.name}`, {
            sourceId: source.id,
            product: request.product,
          });
          
          const searchQuery: SearchQuery = {
            product: request.product,
            country: source.country,
            maxResults: request.maxResults || 10,
            officialOnly: request.officialOnly || false,
          };
          
          const sourceResults = await this.scrapingService.scrapeSource(source, searchQuery);
          
          logger.info(`✅ Scraping completado para ${source.name}: ${sourceResults.length} resultados`, {
            sourceId: source.id,
            resultCount: sourceResults.length,
          });
          
          return sourceResults;
        } catch (error) {
          logger.error(`Error scrapeando ${source.name}`, {
            sourceId: source.id,
            error: error.message,
          });
          return [];
        }
      });

      const scrapingResults = await Promise.all(scrapingPromises);
      
      // Combinar todos los resultados
      scrapingResults.forEach(results => {
        allResults.push(...results);
      });

      logger.info(`Scraping completado: ${allResults.length} productos encontrados`);

      // Log detallado de los resultados antes de validación
      allResults.forEach((result, index) => {
        logger.info(`Resultado ${index + 1}:`, {
          sourceId: result.sourceId,
          productName: result.productName,
          price: result.price,
          confidenceScore: result.confidenceScore,
        });
      });

      // Validación IA de productos
      const validatedResults = await this.validateResultsWithAI(allResults, request);

      // Filtrar y ordenar resultados
      let filteredResults = this.filterResults(validatedResults, request);
      filteredResults = this.sortResults(filteredResults);

      // Análisis global si es búsqueda global
      let globalAnalysis: GlobalAnalysis | undefined;
      if (isGlobalSearch && filteredResults.length > 0) {
        globalAnalysis = this.generateGlobalAnalysis(filteredResults, request);
      }

      const responseTime = Date.now() - startTime;

      const response: SearchResponse = {
        query: request,
        isGlobalSearch,
        totalSources: sources.length,
        totalResults: filteredResults.length,
        responseTimeMs: responseTime,
        results: filteredResults,
        globalAnalysis,
        timestamp: new Date(),
      };

      logger.info('Búsqueda completada', {
        product: request.product,
        totalResults: filteredResults.length,
        responseTimeMs: responseTime,
        isGlobalSearch,
      });

      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Error en búsqueda', {
        product: request.product,
        error: error.message,
        responseTimeMs: responseTime,
      });

      return {
        query: request,
        isGlobalSearch: false,
        totalSources: 0,
        totalResults: 0,
        responseTimeMs: responseTime,
        results: [],
        timestamp: new Date(),
      };
    }
  }

  private getCurrencyForCountry(country: string): string {
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

  private filterResults(results: ScrapingResult[], request: SearchRequest): ScrapingResult[] {
    let filtered = results;

    logger.info(`Iniciando filtrado de ${results.length} resultados`);

    // Filtrar solo productos con datos válidos
    filtered = filtered.filter(result => 
      result.productName && 
      result.price > 0 && 
      result.productUrl
    );

    logger.info(`Después de filtro de datos válidos: ${filtered.length} resultados`);

    // Filtrar solo fuentes oficiales si se solicita
    if (request.officialOnly) {
      filtered = filtered.filter(result => result.isOfficialSource);
      logger.info(`Después de filtro oficial: ${filtered.length} resultados`);
    }

    // Filtrar por score de confianza mínimo (ajustado para ser menos restrictivo)
    const minConfidence = this.configService.get('AI_CONFIDENCE_THRESHOLD', 0.5) * 100; // Reducido de 0.7 a 0.5
    filtered = filtered.filter(result => result.confidenceScore >= minConfidence);
    
    logger.info(`Después de filtro de confianza mínima (${minConfidence}%): ${filtered.length} resultados`);

    // Limitar resultados si no se solicitan alternativas (ajustado para ser menos restrictivo)
    if (!request.alternatives) {
      // Reducir umbral de 80% a 70% para matches exactos (más permisivo)
      filtered = filtered.filter(result => result.confidenceScore >= 70);
      logger.info(`Después de filtro de matches exactos (70%): ${filtered.length} resultados`);
    }

    logger.info(`Filtrado completado: ${filtered.length} resultados finales`);

    return filtered;
  }

  private sortResults(results: ScrapingResult[]): ScrapingResult[] {
    return results.sort((a, b) => {
      // Priorizar fuentes oficiales
      if (a.isOfficialSource && !b.isOfficialSource) return -1;
      if (!a.isOfficialSource && b.isOfficialSource) return 1;
      
      // Luego por score de confianza
      if (a.confidenceScore !== b.confidenceScore) {
        return b.confidenceScore - a.confidenceScore;
      }
      
      // Finalmente por precio (menor primero)
      return a.price - b.price;
    });
  }

  private generateGlobalAnalysis(results: ScrapingResult[], request: SearchRequest): GlobalAnalysis {
    // Encontrar mejor precio absoluto
    const bestPrice = results.reduce((best, current) => {
      if (!best || current.price < best.price) {
        return {
          country: this.getCountryFromSourceId(current.sourceId),
          source: current.sourceName,
          price: current.price,
          currency: current.currency,
          productUrl: current.productUrl,
        };
      }
      return best;
    }, null as any);

    // Simular mejor costo total (por ahora solo precio, luego agregaremos envío)
    const bestTotalCost = bestPrice ? {
      country: bestPrice.country,
      source: bestPrice.source,
      totalCost: bestPrice.price,
      deliveryDays: this.estimateDeliveryDays(bestPrice.country, request.country || 'PE'),
    } : null;

    // Disponibilidad local (país solicitado)
    const localCountry = request.country || 'PE';
    const localAvailability = results.filter(result => 
      this.getCountryFromSourceId(result.sourceId) === localCountry
    );

    // Análisis de ahorros
    const localBestPrice = localAvailability.length > 0 
      ? Math.min(...localAvailability.map(r => r.price))
      : 0;
    
    const globalBestPrice = bestPrice?.price || 0;
    const maxSavings = localBestPrice > 0 && globalBestPrice > 0 
      ? ((localBestPrice - globalBestPrice) / localBestPrice) * 100
      : 0;

    // Recomendación estratégica
    let strategicRecommendation = '';
    if (maxSavings > 20) {
      strategicRecommendation = `Ahorro significativo del ${maxSavings.toFixed(1)}% comprando en ${bestPrice?.country}. Considerar importación.`;
    } else if (localAvailability.length > 0) {
      strategicRecommendation = `Mejor opción: compra local en ${localCountry} para entrega inmediata.`;
    } else {
      strategicRecommendation = `Producto disponible en ${bestPrice?.country}. Evaluar importación vs urgencia.`;
    }

    return {
      bestPrice,
      bestTotalCost,
      localAvailability,
      strategicRecommendation,
      savingsAnalysis: {
        maxSavings: Math.round(maxSavings),
        recommendedAction: maxSavings > 15 ? 'importar' : 'comprar_local',
      },
    };
  }

  private getCountryFromSourceId(sourceId: string): string {
    // Extraer país del ID de la fuente
    if (sourceId.includes('-pe')) return 'PE';
    if (sourceId.includes('-mx')) return 'MX';
    if (sourceId.includes('-us')) return 'US';
    if (sourceId.includes('-ar')) return 'AR';
    if (sourceId.includes('-cl')) return 'CL';
    if (sourceId.includes('-de')) return 'DE';
    if (sourceId.includes('-uk')) return 'UK';
    
    // Fallback: buscar en el servicio de fuentes
    const source = this.sourcesService.getSourceById(sourceId);
    return source?.country || 'UNKNOWN';
  }

  private estimateDeliveryDays(fromCountry: string, toCountry: string): number {
    // Estimaciones simples de entrega
    if (fromCountry === toCountry) return 1; // Local
    
    const deliveryMatrix: Record<string, Record<string, number>> = {
      'US': { 'PE': 7, 'MX': 3, 'AR': 10, 'CL': 8, 'BR': 9 },
      'DE': { 'PE': 12, 'US': 5, 'UK': 2, 'FR': 1, 'ES': 2 },
      'PE': { 'CL': 3, 'AR': 4, 'BR': 5, 'MX': 8, 'US': 7 },
    };
    
    return deliveryMatrix[fromCountry]?.[toCountry] || 14; // Default 2 semanas
  }

  private async validateResultsWithAI(results: ScrapingResult[], request: SearchRequest): Promise<ScrapingResult[]> {
    if (results.length === 0) return results;

    logger.info(`Iniciando validación IA de ${results.length} productos`);

    // Preparar requests para validación IA
    const validationRequests: ProductValidationRequest[] = results.map(result => ({
      searchQuery: request.product,
      productName: result.productName,
      brand: result.brand,
      price: result.price,
      currency: result.currency,
      sourceType: this.sourcesService.getSourceById(result.sourceId)?.type || 'unknown',
    }));

    // Validar con IA
    const aiValidations = await this.aiService.batchValidate(validationRequests);

    // Actualizar resultados con validación IA
    const validatedResults = results.map((result, index) => {
      const aiValidation = aiValidations[index];
      
      return {
        ...result,
        confidenceScore: Math.round(aiValidation.confidenceScore * 100),
        brand: aiValidation.extractedBrand || result.brand,
        model: aiValidation.extractedModel,
        // Agregar información de validación IA
        aiValidation: {
          isExactMatch: aiValidation.isExactMatch,
          reasoning: aiValidation.reasoning,
          provider: aiValidation.aiProvider,
        },
      };
    });

    const exactMatches = validatedResults.filter(r => r.aiValidation?.isExactMatch).length;
    
    logger.info('Validación IA completada', {
      totalProducts: results.length,
      exactMatches,
      avgConfidence: validatedResults.reduce((sum, r) => sum + r.confidenceScore, 0) / validatedResults.length,
    });

    return validatedResults;
  }
} 