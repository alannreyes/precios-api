import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService, SearchRequest } from './search.service';
import { AIService } from '../ai/ai.service';
import { AuthGuard } from '../auth/auth.guard';
import { logger } from '../config/logger.config';

@Controller('search')
@UseGuards(AuthGuard)
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly aiService: AIService,
  ) {}

  @Get()
  async search(
    @Query('product') product: string,
    @Query('country') country?: string,
    @Query('maxResults') maxResults?: string,
    @Query('alternatives') alternatives?: string,
    @Query('officialOnly') officialOnly?: string,
  ) {
    if (!product) {
      return {
        error: 'Parámetro "product" es requerido',
        example: '/search?product=taladro%20bosch&country=PE',
      };
    }

    const request: SearchRequest = {
      product: product.trim(),
      country: country?.toUpperCase(),
      maxResults: maxResults ? parseInt(maxResults, 10) : 10,
      alternatives: alternatives === 'true',
      officialOnly: officialOnly === 'true',
    };

    logger.info('Solicitud de búsqueda local', {
      product: request.product,
      country: request.country,
      maxResults: request.maxResults,
    });

    return await this.searchService.search(request);
  }

  @Get('global')
  async globalSearch(
    @Query('product') product: string,
    @Query('countries') countries?: string,
    @Query('maxResults') maxResults?: string,
    @Query('alternatives') alternatives?: string,
    @Query('officialOnly') officialOnly?: string,
  ) {
    if (!product) {
      return {
        error: 'Parámetro "product" es requerido',
        example: '/search/global?product=taladro%20bosch&countries=PE,US,DE',
      };
    }

    const countriesArray = countries 
      ? countries.split(',').map(c => c.trim().toUpperCase())
      : ['ALL'];

    const request: SearchRequest = {
      product: product.trim(),
      countries: countriesArray,
      maxResults: maxResults ? parseInt(maxResults, 10) : 20,
      alternatives: alternatives === 'true',
      officialOnly: officialOnly === 'true',
    };

    logger.info('Solicitud de búsqueda global', {
      product: request.product,
      countries: request.countries,
      maxResults: request.maxResults,
    });

    return await this.searchService.search(request);
  }

  @Get('test')
  async testSearch() {
    logger.info('Ejecutando búsqueda de prueba');
    
    const testRequest: SearchRequest = {
      product: 'taladro bosch',
      country: 'PE',
      maxResults: 5,
      alternatives: true,
      officialOnly: false,
    };

    return await this.searchService.search(testRequest);
  }

  @Get('ai-status')
  async getAIStatus() {
    logger.info('Consultando estado de IA');
    return this.aiService.getAIStatus();
  }
} 