import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  @Get('/health')
  @ApiOperation({ summary: '健康检查接口' })
  @ApiResponse({ status: 200, description: '服务正常运行' })
  healthCheck() {
    return {
      code: 200,
      message: 'OK',
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'uni-admin-server',
        version: '0.0.1',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
