import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SourcesModule } from '../sources/sources.module';
import { ScrapingModule } from '../scraping/scraping.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [SourcesModule, ScrapingModule, AIModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {} 