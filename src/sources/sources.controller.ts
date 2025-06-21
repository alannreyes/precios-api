import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SourcesService } from './sources.service';
import { AuthGuard } from '../auth/auth.guard';
import { logger } from '../config/logger.config';

@Controller('sources')
@UseGuards(AuthGuard)
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  getAllSources() {
    logger.info('Obteniendo todas las fuentes activas');
    return {
      sources: this.sourcesService.getActiveSources(),
      stats: this.sourcesService.getSourcesStats(),
    };
  }

  @Get('by-country')
  getSourcesByCountry(@Query('country') country: string) {
    if (!country) {
      return { error: 'País requerido' };
    }
    
    logger.info(`Obteniendo fuentes para país: ${country}`);
    return {
      country,
      sources: this.sourcesService.getSourcesByCountry(country),
    };
  }

  @Get('by-type')
  getSourcesByType(@Query('type') type: string) {
    if (!type) {
      return { error: 'Tipo requerido' };
    }
    
    logger.info(`Obteniendo fuentes por tipo: ${type}`);
    return {
      type,
      sources: this.sourcesService.getSourcesByType(type),
    };
  }

  @Get('official')
  getOfficialSources() {
    logger.info('Obteniendo fuentes oficiales');
    return {
      sources: this.sourcesService.getOfficialSources(),
    };
  }

  @Get('global')
  getGlobalSources(@Query('countries') countries?: string) {
    const countryList = countries ? countries.split(',') : undefined;
    logger.info('Obteniendo fuentes para búsqueda global', { countries: countryList });
    
    return {
      countries: countryList || 'ALL',
      sources: this.sourcesService.getGlobalSources(countryList),
    };
  }

  @Get('stats')
  getStats() {
    logger.info('Obteniendo estadísticas de fuentes');
    return this.sourcesService.getSourcesStats();
  }
} 