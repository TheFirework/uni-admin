import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/utils/prisma.service';
import { RedisCacheService } from '../../common/cache/redis-cache.service';
import type { CreateDictTypeDto, UpdateDictTypeDto, DictTypeQueryDto } from './dto/type.dto';
import type { CreateDictDataDto, UpdateDictDataDto, DictDataQueryDto } from './dto/data.dto';

const CACHE_TTL = 300;
const CACHE_EMPTY_TTL = 60;
const CACHE_KEY_PREFIX = 'dict:';

@Injectable()
export class DictionaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisCache: RedisCacheService,
  ) {}

  // ====== 字典类型 CRUD ======

  async findTypeList(query: DictTypeQueryDto) {
    // 字符串参数转整数，并做边界约束
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10) || 10));
    const { ...filters } = query;
    const where: Record<string, any> = { isDeleted: 0 };

    if (filters.keyword) {
      Object.assign(where, {
        OR: [
          { dictCode: { contains: filters.keyword } },
          { dictName: { contains: filters.keyword } },
        ],
      });
    }
    if (filters.status !== undefined) {
      Object.assign(where, { status: Number(filters.status) });
    }

    // 并行查询数据和总数
    const [list, total] = await Promise.all([
      this.prisma.sysDictType.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.sysDictType.count({ where }),
    ]);

    return { list, total };
  }

  async findTypeById(id: number) {
    const type = await this.prisma.sysDictType.findFirst({
      where: { id, isDeleted: 0 },
    });
    if (!type) throw new NotFoundException('字典类型不存在');
    return type;
  }

  async createType(dto: CreateDictTypeDto, operator?: string) {
    const existing = await this.prisma.sysDictType.findFirst({
      where: { dictCode: dto.dictCode, isDeleted: 0 },
    });
    if (existing) throw new BadRequestException('字典编码已存在');

    return this.prisma.sysDictType.create({
      data: {
        dictCode: dto.dictCode,
        dictName: dto.dictName,
        remark: dto.remark,
        status: dto.status ?? 1,
        isSystem: dto.isSystem ?? 0,
        createBy: operator,
      },
    });
  }

  async updateType(id: number, dto: UpdateDictTypeDto, operator?: string) {
    const type = await this.findTypeById(id);

    if (type.isSystem === 1) throw new ForbiddenException('不允许修改系统内置字典');

    return this.prisma.sysDictType.update({
      where: { id },
      data: {
        ...dto,
        updateBy: operator,
      },
    });
  }

  async deleteType(id: number) {
    const type = await this.findTypeById(id);
    if (type.isSystem === 1) throw new ForbiddenException('系统内置字典不允许删除');

    await this.prisma.sysDictType.update({
      where: { id },
      data: { isDeleted: 1 },
    });
    await this.clearCache();
  }

  async toggleTypeStatus(id: number, status: number, operator?: string) {
    const type = await this.findTypeById(id);

    return this.prisma.sysDictType.update({
      where: { id },
      data: { status, updateBy: operator },
    }).then(() => this.clearCache());
  }

  // ====== 字典数据 CRUD ======

  async findDataList(query: DictDataQueryDto) {
    const where = { isDeleted: 0 };
    if (query.dictCode) Object.assign(where, { dictCode: query.dictCode });
    if (query.status !== undefined) Object.assign(where, { status: query.status });

    return this.prisma.sysDictData.findMany({
      where,
      orderBy: { sort: 'asc' },
    });
  }

  async findDataById(id: number) {
    const data = await this.prisma.sysDictData.findFirst({
      where: { id, isDeleted: 0 },
    });
    if (!data) throw new NotFoundException('字典数据不存在');
    return data;
  }

  async createData(dto: CreateDictDataDto, operator?: string) {
    const dictType = await this.prisma.sysDictType.findFirst({
      where: { dictCode: dto.dictCode, isDeleted: 0 },
    });
    if (!dictType) throw new BadRequestException('字典类型不存在');
    if (dictType.status === 0) throw new BadRequestException('目标字典类型已禁用');

    const result = await this.prisma.sysDictData.create({
      data: {
        dictCode: dto.dictCode,
        dictLabel: dto.dictLabel,
        dictValue: dto.dictValue,
        tagType: dto.tagType,
        sort: dto.sort ?? 0,
        status: dto.status ?? 1,
        remark: dto.remark,
        createBy: operator,
      },
    });

    await this.clearCache();
    return result;
  }

  async updateData(id: number, dto: UpdateDictDataDto, operator?: string) {
    await this.findDataById(id);

    const result = await this.prisma.sysDictData.update({
      where: { id },
      data: { ...dto, updateBy: operator },
    });

    await this.clearCache();
    return result;
  }

  async deleteData(id: number) {
    await this.findDataById(id);

    await this.prisma.sysDictData.update({
      where: { id },
      data: { isDeleted: 1 },
    });
    await this.clearCache();
  }

  // ====== 公开查询（带缓存）======

  async getItemsByCode(dictCode: string) {
    const cacheKey = `${CACHE_KEY_PREFIX}data:${dictCode}`;
    const cached = await this.redisCache.get<any[]>(cacheKey);
    if (cached !== undefined) return cached;

    const items = await this.prisma.sysDictData.findMany({
      where: {
        dictCode,
        status: 1,
        isDeleted: 0,
      },
      orderBy: { sort: 'asc' },
    });

    const result = items.map((item) => ({
      dictLabel: item.dictLabel,
      dictValue: item.dictValue,
      tagType: item.tagType,
      sort: item.sort,
    }));

    const ttl = result.length > 0 ? CACHE_TTL : CACHE_EMPTY_TTL;
    await this.redisCache.set(cacheKey, result, ttl);
    return result;
  }

  async getLabelByValue(dictCode: string, value: string): Promise<string> {
    const items = await this.getItemsByCode(dictCode);
    const found = items.find((item) => item.dictValue === value);
    return found ? found.dictLabel : value;
  }

  async getBatchItems(codes: string[]): Promise<Record<string, any[]>> {
    const results: Record<string, any[]> = {};
    const items = await Promise.all(codes.map((code) => this.getItemsByCode(code)));
    codes.forEach((code, index) => {
      results[code] = items[index];
    });
    return results;
  }

  // ====== 缓存管理 ======

  private async clearCache() {
    await this.redisCache.invalidatePattern(`${CACHE_KEY_PREFIX}*`);
  }
}
