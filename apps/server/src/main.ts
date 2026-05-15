import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { knife4jSetup } from 'nest-knife4j';
import { AppModule } from './app.module.js';
import { LoggerService } from './common/logger/logger.service.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

/**
 * NestJS 应用启动入口
 *
 * 初始化流程:
 *   1. 创建 NestJS 应用实例（加载 AppModule 及其依赖）
 *   2. 加载环境变量配置（从 .env 文件）
 *   3. 配置全局中间件（CORS、ValidationPipe、拦截器、过滤器）
 *   4. 集成 Swagger/Knife4j API 文档
 *   5. 启动 HTTP 服务器监听端口
 *
 * TODO: [邮件服务] 集成 Nodemailer 用于发送系统邮件
 *   - 注册 EmailModule (Gmail SMTP / SendGrid / AWS SES)
 *   - 场景: 注册验证码、密码重置链接、登录告警通知
 *   - 使用 Bull 队列异步发送，避免阻塞请求
 *   - 模板引擎: Handlebars 或 EJS 渲染 HTML 邮件
 *   参考: https://docs.nestjs.com/techniques/email
 *
 * TODO: [监控端点] 添加健康检查和 Prometheus 监控
 *   - 实现 /health 端点（检查 MySQL、Redis 连接状态）
 *   - 集成 prom-client 导出 metrics (/metrics 端点)
 *   - 关键指标: HTTP 请求延迟、错误率、活跃连接数
 *   - 可视化: Grafana Dashboard + Alertmanager 告警
 *   使用库: @nestjs/terminus (健康检查) + prom-client (metrics)
 *
 * TODO: [安全加固] 生产环境必需的安全配置
 *   - 启用 Helmet 中间件（设置安全响应头: X-Frame-Options, CSP 等）
 *   - 配置速率限制（@nestjs/throttler: 100 requests/min per IP）
 *   - 启用 Compression 压缩中间件（gzip/br）
 *   - 配置 Trust Proxy（反向代理场景获取真实 IP）
 *
 * TODO: [优雅关闭] 实现应用生命周期钩子
 *   - 监听 SIGTERM/SIGINT 信号（Kubernetes pod 终止或 Docker stop）
 *   - 等待进行中的请求完成（graceful timeout: 30s）
 *   - 关闭数据库连接池、Redis 连接、Bull Queue worker
 *   - 使用 app.enableShutdownHooks() + beforeDestroy 生命周期事件
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 在 ConfigModule 加载 .env 之后，才初始化 env 配置
  const { getEnv } = await import('./config/env.config.js');
  const env = getEnv();

  // ====== 全局前缀与 CORS ======
  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: env.corsOrigins || ['http://localhost:5173'],
    credentials: true,
  });

  // ====== 全局管道: 参数校验 ======
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // ====== 全局拦截器: 请求日志 ======
  // 使用 APP_INTERCEPTOR token 注入 LoggerService（确保依赖可解析）
  const loggerService = app.get(LoggerService);
  app.useGlobalInterceptors(new LoggingInterceptor(loggerService));

  // ====== 全局过滤器: 异常统一处理 ======
  app.useGlobalFilters(new HttpExceptionFilter(loggerService));

  // ====== Swagger/Knife4j 文档（非生产环境） ======
  if (env.enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Uni-Admin API')
      .setDescription('Uni-Admin 管理后台 API 文档（基于 Knife4j 增强）')
      .setVersion(env.buildVersion)
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);

    // 标准 Swagger UI (JSON + UI)
    SwaggerModule.setup('api/docs', app, document);

    // Knife4j 增强版 UI (访问: /doc.html)
    knife4jSetup(app, [
      {
        name: `${env.buildVersion} 版本`,
        url: `/api/docs-json`,
        swaggerVersion: '2.0',
        location: `/api/docs-json`,
      },
    ]);

    console.log(`📚 Knife4j 增强文档: http://localhost:${env.port}/doc.html`);
    console.log(`📚 标准 Swagger 文档: http://localhost:${env.port}/api/docs`);
  }

  await app.listen(env.port);
  console.log(`🚀 Server is running on: http://localhost:${env.port}`);
  console.log(`📦 Version: ${env.buildVersion} | Env: ${env.appEnv}`);
  if (env.enableSwagger) {
    console.log(`📚 Swagger docs available at: http://localhost:${env.port}/api/docs`);
  }
}

bootstrap();
