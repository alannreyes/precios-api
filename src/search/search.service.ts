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

      // Por ahora simulamos resultados ya que el scraping está en desarrollo
      const mockResults = this.generateMockResults(sources, request);

      // Validación IA de productos
      const validatedResults = await this.validateResultsWithAI(mockResults, request);

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

  // Generar resultados mock para testing mientras implementamos scraping real
  private generateMockResults(sources: any[], request: SearchRequest): ScrapingResult[] {
    const mockResults: ScrapingResult[] = [];
    
    sources.forEach((source, index) => {
      // Simular 1-3 productos por fuente
      const productsCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < productsCount; i++) {
        const basePrice = 100 + Math.random() * 500;
        const isOfficial = source.isOfficial && Math.random() > 0.3;
        
        mockResults.push({
          sourceId: source.id,
          sourceName: source.name,
          productName: `${request.product} ${source.country} Modelo ${i + 1}`,
          brand: isOfficial ? 'Bosch' : Math.random() > 0.5 ? 'Makita' : undefined,
          price: Math.round(basePrice * 100) / 100,
          currency: this.getCurrencyForCountry(source.country),
          productUrl: `${source.baseUrl}/producto-${index}-${i}`,
          imageUrl: `https://example.com/images/producto-${index}-${i}.jpg`,
          availability: Math.random() > 0.1 ? 'in_stock' : 'limited',
          isOfficialSource: isOfficial,
          confidenceScore: Math.round(60 + Math.random() * 40),
          responseTimeMs: Math.round(500 + Math.random() * 2000),
          scrapedAt: new Date(),
        });
      }
    });

    return mockResults;
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

    // Filtrar solo productos con datos válidos
    filtered = filtered.filter(result => 
      result.productName && 
      result.price > 0 && 
      result.productUrl
    );

    // Filtrar solo fuentes oficiales si se solicita
    if (request.officialOnly) {
      filtered = filtered.filter(result => result.isOfficialSource);
    }

    // Filtrar por score de confianza mínimo
    const minConfidence = this.configService.get('AI_CONFIDENCE_THRESHOLD', 0.7) * 100;
    filtered = filtered.filter(result => result.confidenceScore >= minConfidence);

    // Limitar resultados si no se solicitan alternativas
    if (!request.alternatives) {
      // Solo matches exactos (score > 80)
      filtered = filtered.filter(result => result.confidenceScore >= 80);
    }

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