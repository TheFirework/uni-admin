import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDictDataDto {
  @ApiProperty({ description: '字典编码（关联的字典类型）', example: 'user_status' })
  @IsString({ message: '字典编码必须是字符串' })
  @IsNotEmpty({ message: '字典编码不能为空' })
  dictCode!: string;

  @ApiProperty({ description: '字典标签（显示文本）', example: '启用' })
  @IsString({ message: '字典标签必须是字符串' })
  @IsNotEmpty({ message: '字典标签不能为空' })
  dictLabel!: string;

  @ApiProperty({ description: '字典值（存储值）', example: '1' })
  @IsString({ message: '字典值必须是字符串' })
  @IsNotEmpty({ message: '字典值不能为空' })
  dictValue!: string;

  @ApiPropertyOptional({ description: '标签类型（success/danger/warning/info/primary）', example: 'success' })
  @IsOptional()
  @IsString({ message: '标签类型必须是字符串' })
  tagType?: string;

  @ApiPropertyOptional({ description: '排序（数值越小越靠前）', default: 0 })
  @IsOptional()
  @IsInt({ message: '排序必须是整数' })
  sort?: number;

  @ApiPropertyOptional({ description: '状态（0-禁用 1-启用）', default: 1 })
  @IsOptional()
  @IsInt({ message: '状态必须是整数' })
  status?: number;

  @ApiPropertyOptional({ description: '备注', example: '正常启用状态' })
  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  remark?: string;
}

export class UpdateDictDataDto {
  @ApiPropertyOptional({ description: '字典标签（显示文本）', example: '已启用' })
  @IsOptional()
  @IsString({ message: '字典标签必须是字符串' })
  dictLabel?: string;

  @ApiPropertyOptional({ description: '字典值（存储值）' })
  @IsOptional()
  @IsString({ message: '字典值必须是字符串' })
  dictValue?: string;

  @ApiPropertyOptional({ description: '标签类型（success/danger/warning/info/primary）' })
  @IsOptional()
  @IsString({ message: '标签类型必须是字符串' })
  tagType?: string;

  @ApiPropertyOptional({ description: '排序（数值越小越靠前）' })
  @IsOptional()
  @IsInt({ message: '排序必须是整数' })
  sort?: number;

  @ApiPropertyOptional({ description: '状态（0-禁用 1-启用）' })
  @IsOptional()
  @IsInt({ message: '状态必须是整数' })
  status?: number;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  remark?: string;
}

export class DictDataQueryDto {
  @ApiPropertyOptional({ description: '按字典编码筛选' })
  @IsOptional()
  @IsString({ message: '字典编码必须是字符串' })
  dictCode?: string;

  @ApiPropertyOptional({ description: '状态筛选（0-禁用 1-启用）' })
  @IsOptional()
  @IsInt({ message: '状态必须是整数' })
  status?: number;
}
