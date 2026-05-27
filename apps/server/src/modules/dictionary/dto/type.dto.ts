import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDictTypeDto {
  @ApiProperty({ description: '字典编码', example: 'user_status' })
  @IsString({ message: '字典编码必须是字符串' })
  @IsNotEmpty({ message: '字典编码不能为空' })
  dictCode!: string;

  @ApiProperty({ description: '字典名称', example: '用户状态' })
  @IsString({ message: '字典名称必须是字符串' })
  @IsNotEmpty({ message: '字典名称不能为空' })
  dictName!: string;

  @ApiPropertyOptional({ description: '备注', example: '用户账户状态分类' })
  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  remark?: string;

  @ApiPropertyOptional({ description: '状态（0-禁用 1-启用）', default: 1 })
  @IsOptional()
  @IsInt({ message: '状态必须是整数' })
  status?: number;

  @ApiPropertyOptional({ description: '是否系统内置（0-否 1-是）', default: 0 })
  @IsOptional()
  @IsInt({ message: '系统内置标识必须是整数' })
  isSystem?: number;
}

export class UpdateDictTypeDto {
  @ApiPropertyOptional({ description: '字典名称', example: '用户账户状态' })
  @IsOptional()
  @IsString({ message: '字典名称必须是字符串' })
  dictName?: string;

  @ApiPropertyOptional({ description: '备注', example: '更新后的备注' })
  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  remark?: string;

  @ApiPropertyOptional({ description: '状态（0-禁用 1-启用）' })
  @IsOptional()
  @IsInt({ message: '状态必须是整数' })
  status?: number;
}

export class DictTypeQueryDto {
  @ApiPropertyOptional({ description: '搜索关键词（模糊匹配编码或名称）' })
  @IsOptional()
  @IsString({ message: '关键词必须是字符串' })
  keyword?: string;

  @ApiPropertyOptional({ description: '状态筛选（0-禁用 1-启用）' })
  @IsOptional()
  @IsInt({ message: '状态必须是整数' })
  status?: number;

  @ApiPropertyOptional({ description: '当前页码', default: 1 })
  @IsOptional()
  page?: string;

  @ApiPropertyOptional({ description: '每页条数', default: 10 })
  @IsOptional()
  pageSize?: string;
}

export class ToggleStatusDto {
  @ApiProperty({ description: '目标状态（0-禁用 1-启用）', example: 1 })
  @IsInt({ message: '状态必须是整数' })
  @IsIn([0, 1], { message: '状态值只能是 0 或 1' })
  status!: number;
}
