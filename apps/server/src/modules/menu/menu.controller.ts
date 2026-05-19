import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MenuService } from './menu.service';
import { Result } from '../../common/result.js';

@ApiTags('系统管理 - 菜单')
@Controller('system/menus')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MenuController {
  constructor(private readonly menuService: MenuService) { }

  @Get()
  @ApiOperation({ summary: '获取当前用户的路由菜单树', description: '返回用户有权限访问的菜单列表（树形结构），用于前端动态生成路由' })
  @ApiResponse({ status: 200, description: '菜单数据', type: [Object] })
  @ApiResponse({ status: 401, description: '未登录或 Token 过期' })
  async getMenus() {
    const data = await this.menuService.getMenus();
    return Result.success(data);
  }
}
