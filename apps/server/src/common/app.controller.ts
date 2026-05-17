import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  @Get('/health')
  @ApiOperation({ summary: '健康检查接口' })
  @ApiResponse({
    status: 200,
    description: '服务正常运行',
    example: {
      success: true,
      code: 200,
      message: 'ok',
      data: {
        status: 'healthy',
        service: 'uni-admin-server',
        version: '0.0.1',
      },
      timestamp: '2026-05-16T00:00:00.000Z',
    },
  })
  healthCheck() {
    return {
      status: 'healthy',
      service: 'uni-admin-server',
      version: '0.0.1',
    };
  }
}
