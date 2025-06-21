import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SourcesModule } from '../sources/sources.module';
import { ScrapingModule } from '../scraping/scraping.module';
import { AIModule } from '../ai/ai.module';
import { AppCacheModule } from '../cache/cache.module';
import { PerformanceModule } from '../performance/performance.module';

@Module({
  imports: [SourcesModule, ScrapingModule, AIModule, AppCacheModule, PerformanceModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {} 