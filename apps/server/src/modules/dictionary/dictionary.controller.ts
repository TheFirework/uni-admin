import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, ParseIntPipe, BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { DictionaryService } from './dictionary.service.js';
import { Result } from '../../common/result.js';
import {
  CreateDictTypeDto, UpdateDictTypeDto, DictTypeQueryDto, ToggleStatusDto,
} from './dto/type.dto';
import {
  CreateDictDataDto, UpdateDictDataDto, DictDataQueryDto,
} from './dto/data.dto';

@ApiTags('系统管理 - 字典')
@Controller('system/dict')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DictionaryController {
  constructor(private readonly dictService: DictionaryService) { }

  // ====== 字典类型管理 ======

  @Get('type/list')
  @ApiOperation({ summary: '查询字典类型列表' })
  async getTypeList(@Query() query: DictTypeQueryDto) {
    const data = await this.dictService.findTypeList(query);
    return Result.success(data);
  }

  @Post('type')
  @ApiOperation({ summary: '新增字典类型' })
  async createType(@Body() dto: CreateDictTypeDto) {
    const data = await this.dictService.createType(dto);
    return Result.success(data);
  }

  @Put('type/:id')
  @ApiOperation({ summary: '修改字典类型' })
  async updateType(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDictTypeDto,
  ) {
    const data = await this.dictService.updateType(id, dto);
    return Result.success(data);
  }

  @Delete('type/:id')
  @ApiOperation({ summary: '删除字典类型（软删除）' })
  async deleteType(@Param('id', ParseIntPipe) id: number) {
    await this.dictService.deleteType(id);
    return Result.success(null);
  }

  @Put('type/:id/status')
  @ApiOperation({ summary: '启用/禁用字典类型' })
  async toggleTypeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ToggleStatusDto,
  ) {
    await this.dictService.toggleTypeStatus(id, dto.status);
    return Result.success(null);
  }

  // ====== 字典数据管理 ======

  @Get('data/list')
  @ApiOperation({ summary: '查询字典数据列表' })
  async getDataList(@Query() query: DictDataQueryDto) {
    const data = await this.dictService.findDataList(query);
    return Result.success(data);
  }

  @Post('data')
  @ApiOperation({ summary: '新增字典数据' })
  async createData(@Body() dto: CreateDictDataDto) {
    const data = await this.dictService.createData(dto);
    return Result.success(data);
  }

  @Put('data/:id')
  @ApiOperation({ summary: '修改字典数据' })
  async updateData(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDictDataDto,
  ) {
    const data = await this.dictService.updateData(id, dto);
    return Result.success(data);
  }

  @Delete('data/:id')
  @ApiOperation({ summary: '删除字典数据（软删除）' })
  async deleteData(@Param('id', ParseIntPipe) id: number) {
    await this.dictService.deleteData(id);
    return Result.success(null);
  }
}

@ApiTags('公开 - 字典查询')
@Controller('public/dict')
@Public()
export class PublicDictionaryController {
  constructor(private readonly dictService: DictionaryService) { }

  @Get('batch')
  @ApiOperation({ summary: '批量查询多个字典' })
  async getBatchItems(@Query('codes') codes: string) {
    if (!codes) throw new BadRequestException('codes 参数不能为空');
    const codeList = codes.split(',').map((c) => c.trim()).filter(Boolean);
    if (codeList.length === 0) throw new BadRequestException('codes 参数不能为空');

    const data = await this.dictService.getBatchItems(codeList);
    return Result.success(data);
  }

  @Get(':dictCode')
  @ApiOperation({ summary: '按编码查询字典项（带缓存）' })
  async getItemsByCode(@Param('dictCode') dictCode: string) {
    const data = await this.dictService.getItemsByCode(dictCode);
    return Result.success(data);
  }

  @Get(':code/:value')
  @ApiOperation({ summary: '按编码+值翻译为标签' })
  async getLabelByValue(
    @Param('code') code: string,
    @Param('value') value: string,
  ) {
    const data = await this.dictService.getLabelByValue(code, value);
    return Result.success(data);
  }
}
