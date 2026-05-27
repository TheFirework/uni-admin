import { Module } from '@nestjs/common';
import { DictionaryController } from './dictionary.controller.js';
import { PublicDictionaryController } from './dictionary.controller.js';
import { DictionaryService } from './dictionary.service.js';
import { PrismaService } from '../../shared/utils/prisma.service.js';
import { RedisCacheService } from '../../common/cache/redis-cache.service.js';

@Module({
  controllers: [DictionaryController, PublicDictionaryController],
  providers: [DictionaryService, PrismaService, RedisCacheService],
  exports: [DictionaryService],
})
export class DictionaryModule {}
