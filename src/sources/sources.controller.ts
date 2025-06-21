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
    logger.info('Consultando todas las fuentes activas');
    return {
      sources: this.sourcesService.getActiveSources(),
      total: this.sourcesService.getActiveSources().length,
    };
  }

  @Get('by-country')
  getSourcesByCountry(@Query('country') country: string) {
    if (!country) {
      return { error: 'País requerido' };
    }

    logger.info(`Consultando fuentes para país: ${country}`);
    const sources = this.sourcesService.getSourcesByCountry(country);
    
    return {
      country,
      sources,
      total: sources.length,
    };
  }

  @Get('by-type')
  getSourcesByType(@Query('type') type: string) {
    if (!type) {
      return { error: 'Tipo requerido' };
    }

    logger.info(`Consultando fuentes por tipo: ${type}`);
    const sources = this.sourcesService.getSourcesByType(type);
    
    return {
      type,
      sources,
      total: sources.length,
    };
  }

  // NUEVOS ENDPOINTS PARA FASE 3: B2B ESPECIALIZADAS

  @Get('b2b')
  getB2BSources() {
    logger.info('Consultando fuentes B2B especializadas');
    const sources = this.sourcesService.getB2BSpecializedSources();
    
    return {
      sources,
      total: sources.length,
      specializations: [...new Set(sources.map(s => s.specialization).filter(Boolean))],
    };
  }

  @Get('by-specialization')
  getSourcesBySpecialization(@Query('specialization') specialization: string) {
    if (!specialization) {
      return { error: 'Especialización requerida' };
    }

    logger.info(`Consultando fuentes por especialización: ${specialization}`);
    const sources = this.sourcesService.getSourcesBySpecialization(specialization);
    
    return {
      specialization,
      sources,
      total: sources.length,
    };
  }

  @Get('with-technical-specs')
  getSourcesWithTechnicalSpecs() {
    logger.info('Consultando fuentes con especificaciones técnicas');
    const sources = this.sourcesService.getSourcesWithTechnicalSpecs();
    
    return {
      sources,
      total: sources.length,
      capabilities: {
        specifications: sources.filter(s => s.scraperConfig.selectors.specifications).length,
        datasheets: sources.filter(s => s.scraperConfig.selectors.datasheet).length,
        cadFiles: sources.filter(s => s.scraperConfig.selectors.cad_files || s.scraperConfig.selectors.cad_download).length,
      }
    };
  }

  @Get('by-brand')
  getB2BSourcesByBrand(@Query('brand') brand: string) {
    if (!brand) {
      return { error: 'Marca requerida' };
    }

    logger.info(`Consultando fuentes B2B para marca: ${brand}`);
    const sources = this.sourcesService.getB2BSourcesByBrand(brand);
    
    return {
      brand,
      sources,
      total: sources.length,
    };
  }

  @Get('with-capability')
  getSourcesWithCapability(@Query('capability') capability: string) {
    if (!capability) {
      return { error: 'Capacidad requerida (technical_specs, datasheets, cad_files, bulk_pricing)' };
    }

    logger.info(`Consultando fuentes con capacidad: ${capability}`);
    const sources = this.sourcesService.getSourcesWithCapability(capability);
    
    return {
      capability,
      sources,
      total: sources.length,
    };
  }

  @Get('best-b2b')
  getBestB2BSourcesForCountry(
    @Query('country') country: string,
    @Query('specialization') specialization?: string
  ) {
    if (!country) {
      return { error: 'País requerido' };
    }

    logger.info(`Consultando mejores fuentes B2B para ${country}`, {
      country,
      specialization,
    });
    
    const sources = this.sourcesService.getBestB2BSourcesForCountry(country, specialization);
    
    return {
      country,
      specialization,
      sources,
      total: sources.length,
      recommendation: sources.length > 0 ? sources[0] : null,
    };
  }

  @Get('official')
  getOfficialSources() {
    logger.info('Consultando fuentes oficiales');
    const sources = this.sourcesService.getOfficialSources();
    
    return {
      sources,
      total: sources.length,
    };
  }

  @Get('global')
  getGlobalSources(@Query('countries') countries?: string) {
    const countryList = countries ? countries.split(',').map(c => c.trim()) : [];
    
    logger.info('Consultando fuentes globales', {
      countries: countryList,
    });
    
    const sources = this.sourcesService.getGlobalSources(countryList);
    
    return {
      countries: countryList,
      sources,
      total: sources.length,
    };
  }

  @Get('stats')
  getSourcesStats() {
    logger.info('Consultando estadísticas de fuentes');
    const stats = this.sourcesService.getSourcesStats();
    
    return {
      timestamp: new Date().toISOString(),
      ...stats,
    };
  }

  @Get('b2b-config')
  getB2BConfig() {
    logger.info('Consultando configuración B2B');
    const config = this.sourcesService.getB2BConfig();
    
    return {
      config,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('reload')
  async reloadSources() {
    logger.info('Recargando fuentes desde configuración');
    
    try {
      await this.sourcesService.reloadSources();
      const stats = this.sourcesService.getSourcesStats();
      
      return {
        success: true,
        message: 'Fuentes recargadas exitosamente',
        stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error al recargar fuentes:', error);
      return {
        success: false,
        message: 'Error al recargar fuentes',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
} 