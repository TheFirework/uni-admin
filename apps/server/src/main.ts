import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { LoggerService } from './common/logger/logger.service.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { getConfig } from './config/env.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = getConfig();

  // ====== 全局前缀与 CORS ======
  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : ['http://localhost:5173'],
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
  const loggerService = app.get(LoggerService);
  app.useGlobalInterceptors(new LoggingInterceptor(loggerService));

  // ====== 全局过滤器: 异常统一处理 ======
  app.useGlobalFilters(new HttpExceptionFilter(loggerService));

  // ====== Swagger 文档（非生产环境） ======
  if (config.enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('uni-admin API')
      .setDescription('Uni-Admin 管理后台 API 文档')
      .setVersion('0.0.1')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(config.port);
  console.log(`🚀 Server is running on: http://localhost:${config.port}`);
  console.log(`📦 Env: ${config.appEnv}`);
  if (config.enableSwagger) {
    console.log(`📚 Swagger docs available at: http://localhost:${config.port}/api/docs`);
  }
}

bootstrap();
