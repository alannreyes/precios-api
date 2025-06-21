import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SourcesService } from './sources.service';
import { AuthGuard } from '../auth/auth.guard';
import { logger } from '../config/logger.config';
// import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

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

  // =============================================================================
  // NUEVOS ENDPOINTS PARA FASE 4: TIENDAS DIRECTAS + EXPANSIÓN EUROPEA
  // =============================================================================

  @Get('brand-direct')
  getBrandDirectSources() {
    logger.info('Consultando tiendas directas de marca');
    const sources = this.sourcesService.getBrandDirectSources();
    
    return {
      sources,
      total: sources.length,
      brands: [...new Set(sources.flatMap(s => s.officialBrands || []))],
      specializations: [...new Set(sources.map(s => s.specialization).filter(Boolean))],
    };
  }

  @Get('brand-direct/by-brand')
  getBrandDirectSourcesByBrand(@Query('brand') brand: string) {
    if (!brand) {
      return { error: 'Marca requerida' };
    }

    logger.info(`Consultando tiendas directas para marca: ${brand}`);
    const sources = this.sourcesService.getBrandDirectSourcesByBrand(brand);
    
    return {
      brand,
      sources,
      total: sources.length,
    };
  }

  @Get('brand-direct/capabilities')
  getBrandSourcesWithCapability(@Query('capability') capability: string) {
    if (!capability) {
      return { 
        error: 'Capacidad requerida',
        availableCapabilities: [
          'warranty_info', 'official_parts', 'service_centers', 'training_materials',
          'software_downloads', 'calibration_certificates', 'msds_sheets', 
          'certification_docs', 'cad_drawings', 'calculation_software'
        ]
      };
    }

    logger.info(`Consultando tiendas directas con capacidad: ${capability}`);
    const sources = this.sourcesService.getBrandSourcesWithCapability(capability);
    
    return {
      capability,
      sources,
      total: sources.length,
    };
  }

  @Get('european')
  getAllEuropeanSources() {
    logger.info('Consultando todas las fuentes europeas');
    const sources = this.sourcesService.getAllEuropeanSources();
    
    return {
      sources,
      total: sources.length,
      countries: [...new Set(sources.map(s => s.country))],
      types: [...new Set(sources.map(s => s.type))],
    };
  }

  @Get('european/by-country')
  getEuropeanSourcesByCountry(@Query('country') country: string) {
    if (!country) {
      return { error: 'País europeo requerido (ES, IT, FR, NL, DE, AT, CH, BE, LU, PT)' };
    }

    logger.info(`Consultando fuentes europeas para: ${country}`);
    const sources = this.sourcesService.getEuropeanSourcesByCountry(country);
    
    return {
      country,
      sources,
      total: sources.length,
      types: [...new Set(sources.map(s => s.type))],
    };
  }

  @Get('retail-specialized')
  getRetailSpecializedSources() {
    logger.info('Consultando fuentes retail especializadas');
    const sources = this.sourcesService.getRetailSpecializedSources();
    
    return {
      sources,
      total: sources.length,
      countries: [...new Set(sources.map(s => s.country))],
      specializations: [...new Set(sources.map(s => s.specialization).filter(Boolean))],
    };
  }

  @Get('retail-specialized/by-country')
  getRetailSourcesByEuropeanCountry(@Query('country') country: string) {
    if (!country) {
      return { error: 'País europeo requerido' };
    }

    logger.info(`Consultando fuentes retail para: ${country}`);
    const sources = this.sourcesService.getRetailSourcesByEuropeanCountry(country);
    
    return {
      country,
      sources,
      total: sources.length,
    };
  }

  @Get('european/best-by-region')
  getBestSourcesByEuropeanRegion(@Query('countries') countries: string) {
    if (!countries) {
      return { error: 'Lista de países requerida (ej: ES,IT,FR)' };
    }

    const countryList = countries.split(',').map(c => c.trim());
    logger.info(`Consultando mejores fuentes para región europea: ${countryList.join(', ')}`);
    
    const sources = this.sourcesService.getBestSourcesByEuropeanRegion(countryList);
    
    return {
      region: countryList,
      sources,
      total: sources.length,
      recommendation: sources.length > 0 ? sources[0] : null,
    };
  }

  @Get('multi-language')
  getMultiLanguageSources() {
    logger.info('Consultando fuentes con soporte multiidioma');
    const sources = this.sourcesService.getMultiLanguageSources();
    
    return {
      sources,
      total: sources.length,
      countries: [...new Set(sources.map(s => s.country))],
    };
  }

  @Get('international-shipping')
  getInternationalShippingSources() {
    logger.info('Consultando fuentes con envío internacional');
    const sources = this.sourcesService.getInternationalShippingSources();
    
    return {
      sources,
      total: sources.length,
      averageShippingCountries: sources.reduce((sum, s) => sum + (s.shippingCountries?.length || 0), 0) / sources.length,
    };
  }

  @Get('phase4-stats')
  getPhase4Stats() {
    logger.info('Consultando estadísticas de la Fase 4');
    const stats = this.sourcesService.getPhase4Stats();
    
    return {
      timestamp: new Date().toISOString(),
      phase: 4,
      description: 'Tiendas Directas de Marca + Expansión Europea',
      ...stats,
    };
  }

  @Get('recommendations')
  getRecommendedSourcesForProduct(
    @Query('productType') productType: string,
    @Query('country') country?: string,
    @Query('brand') brand?: string
  ) {
    if (!productType) {
      return { 
        error: 'Tipo de producto requerido',
        availableTypes: [
          'power_tools', 'hand_tools', 'measuring_tools', 'safety_equipment',
          'electrical_tools', 'industrial_supplies', 'electronics', 'construction'
        ]
      };
    }

    logger.info(`Consultando fuentes recomendadas para producto: ${productType}`, {
      productType,
      country,
      brand,
    });
    
    const sources = this.sourcesService.getRecommendedSourcesForProduct(productType, country, brand);
    
    return {
      productType,
      country,
      brand,
      sources: sources.slice(0, 10), // Top 10 recomendaciones
      total: sources.length,
      topRecommendation: sources.length > 0 ? sources[0] : null,
    };
  }

  @Get('complete-stats')
  getCompleteStats() {
    logger.info('Consultando estadísticas completas del sistema');
    const basicStats = this.sourcesService.getSourcesStats();
    const phase4Stats = this.sourcesService.getPhase4Stats();
    const allSources = this.sourcesService.getActiveSources();
    
    return {
      timestamp: new Date().toISOString(),
      system: {
        version: '1.0.0',
        phase: 4,
        description: 'Sistema completo con Fase 4 implementada',
      },
      overview: basicStats,
      phase4: phase4Stats,
      coverage: {
        totalCountries: [...new Set(allSources.map(s => s.country))].length,
        totalBrands: [...new Set(allSources.flatMap(s => s.officialBrands || []))].length,
        totalSpecializations: [...new Set(allSources.map(s => s.specialization).filter(Boolean))].length,
        globalShipping: this.sourcesService.getInternationalShippingSources().length,
      },
      types: {
        marketplace: this.sourcesService.getSourcesByType('marketplace').length,
        b2b_specialized: this.sourcesService.getB2BSpecializedSources().length,
        brand_direct: this.sourcesService.getBrandDirectSources().length,
        retail_specialized: this.sourcesService.getRetailSpecializedSources().length,
      }
    };
  }

  // ====================================
  // FASE 5: MERCADOS MANUFACTUREROS + ASIA
  // ====================================

  @Get('asian')
  getAsianSources() {
    return this.sourcesService.getAsianSources();
  }

  @Get('asian/by-country')
  getAsianSourcesByCountry(@Query('country') country: string) {
    return this.sourcesService.getAsianSourcesByCountry(country);
  }

  @Get('manufacturing')
  getManufacturingMarketSources() {
    return this.sourcesService.getManufacturingMarketSources();
  }

  @Get('asian/b2b')
  getAsianB2BSources() {
    return this.sourcesService.getAsianB2BSources();
  }

  @Get('oem-capable')
  getOEMCapableSources() {
    return this.sourcesService.getOEMCapableSources();
  }

  @Get('asian/regional-shipping')
  getAsianRegionalShippingSources() {
    return this.sourcesService.getAsianRegionalShippingSources();
  }

  @Get('manufacturing/by-specialization')
  getSourcesByManufacturingSpecialization(@Query('specialization') specialization: string) {
    return this.sourcesService.getSourcesByManufacturingSpecialization(specialization);
  }

  @Get('asian/best')
  getBestAsianSources(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.sourcesService.getBestAsianSources(limitNum);
  }

  @Get('asian/multi-language')
  getAsianMultiLanguageSources() {
    return this.sourcesService.getAsianMultiLanguageSources();
  }

  @Get('asian/official')
  getOfficialAsianSources() {
    return this.sourcesService.getOfficialAsianSources();
  }

  @Get('regional-hubs')
  getRegionalHubSources() {
    return this.sourcesService.getRegionalHubSources();
  }

  @Get('asian/coverage-analysis')
  getAsianCoverageAnalysis() {
    return this.sourcesService.getAsianCoverageAnalysis();
  }

  @Get('asian/shipping-cost')
  calculateAsianShippingCost(
    @Query('fromCountry') fromCountry: string,
    @Query('toCountry') toCountry: string,
    @Query('weight') weight?: string
  ) {
    const weightNum = weight ? parseFloat(weight) : 1;
    return this.sourcesService.calculateAsianShippingCost(fromCountry, toCountry, weightNum);
  }

  @Get('asian/product-recommendations')
  getAsianProductRecommendations(
    @Query('product') product: string,
    @Query('targetCountry') targetCountry: string
  ) {
    return this.sourcesService.getAsianProductRecommendations(product, targetCountry);
  }

  @Get('phase5-stats')
  getPhase5Stats() {
    return this.sourcesService.getPhase5Stats();
  }
} 