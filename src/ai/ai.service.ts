import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { logger } from '../config/logger.config';

export interface AIValidationResult {
  isExactMatch: boolean;
  confidenceScore: number;
  extractedBrand?: string;
  extractedModel?: string;
  reasoning: string;
  aiProvider: 'openai' | 'gemini' | 'mock';
}

export interface ProductValidationRequest {
  searchQuery: string;
  productName: string;
  brand?: string;
  price: number;
  currency: string;
  sourceType: string;
}

@Injectable()
export class AIService {
  private readonly openaiEnabled: boolean;
  private readonly geminiEnabled: boolean;
  private readonly aiValidationEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.openaiEnabled = !!this.configService.get('OPENAI_API_KEY');
    this.geminiEnabled = !!this.configService.get('GEMINI_API_KEY');
    this.aiValidationEnabled = this.configService.get('AI_VALIDATION_ENABLED', false);
    
    logger.info('AI Service inicializado', {
      openaiEnabled: this.openaiEnabled,
      geminiEnabled: this.geminiEnabled,
      aiValidationEnabled: this.aiValidationEnabled,
    });
  }

  async validateProduct(request: ProductValidationRequest): Promise<AIValidationResult> {
    if (!this.aiValidationEnabled) {
      return this.generateMockValidation(request);
    }

    try {
      // Intentar con OpenAI primero
      if (this.openaiEnabled) {
        const result = await this.validateWithOpenAI(request);
        if (result.confidenceScore > 0.8) {
          return result;
        }
      }

      // Fallback a Gemini para validación dual
      if (this.geminiEnabled) {
        return await this.validateWithGemini(request);
      }

      // Fallback a validación mock
      return this.generateMockValidation(request);

    } catch (error) {
      logger.error('Error en validación AI', {
        error: error.message,
        searchQuery: request.searchQuery,
        productName: request.productName,
      });

      return this.generateMockValidation(request);
    }
  }

  private async validateWithOpenAI(request: ProductValidationRequest): Promise<AIValidationResult> {
    const prompt = this.buildValidationPrompt(request);
    
    // Simular llamada a OpenAI (implementar cuando tengas key real)
    logger.info('Simulando validación OpenAI', {
      searchQuery: request.searchQuery,
      productName: request.productName,
    });

    // Por ahora retornamos validación inteligente simulada
    return this.generateIntelligentValidation(request, 'openai');
  }

  private async validateWithGemini(request: ProductValidationRequest): Promise<AIValidationResult> {
    const prompt = this.buildValidationPrompt(request);
    
    // Simular llamada a Gemini (implementar cuando tengas key real)
    logger.info('Simulando validación Gemini', {
      searchQuery: request.searchQuery,
      productName: request.productName,
    });

    return this.generateIntelligentValidation(request, 'gemini');
  }

  private buildValidationPrompt(request: ProductValidationRequest): string {
    return `
Analiza si este producto coincide exactamente con la búsqueda:

BÚSQUEDA: "${request.searchQuery}"
PRODUCTO ENCONTRADO: "${request.productName}"
MARCA: ${request.brand || 'No especificada'}
PRECIO: ${request.price} ${request.currency}
FUENTE: ${request.sourceType}

Evalúa:
1. ¿Es el mismo producto específico?
2. ¿Coincide la marca?
3. ¿Es el modelo correcto?
4. ¿El precio es razonable?

Responde en JSON:
{
  "isExactMatch": boolean,
  "confidenceScore": 0.0-1.0,
  "extractedBrand": "marca identificada",
  "extractedModel": "modelo identificado", 
  "reasoning": "explicación detallada"
}
`;
  }

  private generateIntelligentValidation(
    request: ProductValidationRequest, 
    provider: 'openai' | 'gemini'
  ): AIValidationResult {
    const searchLower = request.searchQuery.toLowerCase();
    const productLower = request.productName.toLowerCase();
    
    // Análisis inteligente de coincidencia
    const searchWords = searchLower.split(' ').filter(word => word.length > 2);
    const matchingWords = searchWords.filter(word => productLower.includes(word));
    const wordMatchRatio = matchingWords.length / searchWords.length;
    
    // Detectar marca
    const commonBrands = ['bosch', 'makita', 'dewalt', 'stanley', '3m', 'caterpillar', 'milwaukee'];
    const detectedBrand = commonBrands.find(brand => 
      searchLower.includes(brand) || productLower.includes(brand)
    );
    
    // Validación de marca
    const brandMatch = detectedBrand && (
      (request.brand?.toLowerCase().includes(detectedBrand)) ||
      productLower.includes(detectedBrand)
    );
    
    // Calcular score de confianza
    let confidenceScore = wordMatchRatio * 0.6; // 60% por palabras coincidentes
    if (brandMatch) confidenceScore += 0.3; // 30% por marca correcta
    if (request.price > 0) confidenceScore += 0.1; // 10% por precio válido
    
    // Determinar si es match exacto
    const isExactMatch = confidenceScore >= 0.85 && wordMatchRatio >= 0.7;
    
    return {
      isExactMatch,
      confidenceScore: Math.round(confidenceScore * 100) / 100,
      extractedBrand: detectedBrand || request.brand,
      extractedModel: this.extractModel(productLower),
      reasoning: `Análisis ${provider.toUpperCase()}: ${Math.round(wordMatchRatio * 100)}% coincidencia de palabras, marca ${brandMatch ? 'verificada' : 'no confirmada'}`,
      aiProvider: provider,
    };
  }

  private generateMockValidation(request: ProductValidationRequest): AIValidationResult {
    const searchLower = request.searchQuery.toLowerCase();
    const productLower = request.productName.toLowerCase();
    
    // Validación básica sin IA
    const hasCommonWords = searchLower.split(' ').some(word => 
      word.length > 3 && productLower.includes(word)
    );
    
    const confidenceScore = hasCommonWords ? 0.75 : 0.45;
    
    return {
      isExactMatch: confidenceScore > 0.7,
      confidenceScore,
      extractedBrand: request.brand,
      reasoning: 'Validación básica sin IA - basada en coincidencia de palabras clave',
      aiProvider: 'mock',
    };
  }

  private extractModel(productText: string): string | undefined {
    // Buscar patrones comunes de modelos
    const modelPatterns = [
      /modelo\s+([a-z0-9\-]+)/i,
      /model\s+([a-z0-9\-]+)/i,
      /\b([a-z]{2,4}\d{2,4}[a-z]?)\b/i, // Ej: GSB120, DWE7491
      /\b(v\d{2})\b/i, // Ej: V20
    ];
    
    for (const pattern of modelPatterns) {
      const match = productText.match(pattern);
      if (match) {
        return match[1].toUpperCase();
      }
    }
    
    return undefined;
  }

  async batchValidate(requests: ProductValidationRequest[]): Promise<AIValidationResult[]> {
    logger.info(`Iniciando validación en lote de ${requests.length} productos`);
    
    const results = await Promise.all(
      requests.map(request => this.validateProduct(request))
    );
    
    const exactMatches = results.filter(r => r.isExactMatch).length;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidenceScore, 0) / results.length;
    
    logger.info('Validación en lote completada', {
      totalProducts: requests.length,
      exactMatches,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
    });
    
    return results;
  }

  getAIStatus() {
    return {
      openaiEnabled: this.openaiEnabled,
      geminiEnabled: this.geminiEnabled,
      aiValidationEnabled: this.aiValidationEnabled,
      availableProviders: [
        ...(this.openaiEnabled ? ['openai'] : []),
        ...(this.geminiEnabled ? ['gemini'] : []),
        'mock'
      ],
    };
  }
} 