import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 在 ConfigModule 加载 .env 之后，才初始化 env 配置
  const { getEnv } = await import('./config/env.config.js');
  const env = getEnv();

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: env.corsOrigins || ['http://localhost:5173'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  if (env.enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('uni-admin API')
      .setDescription('Uni-Admin 管理后台 API 文档')
      .setVersion(env.buildVersion)
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(env.port);
  console.log(`🚀 Server is running on: http://localhost:${env.port}`);
  console.log(`📦 Version: ${env.buildVersion} | Env: ${env.appEnv}`);
  if (env.enableSwagger) {
    console.log(`📚 Swagger docs available at: http://localhost:${env.port}/api/docs`);
  }
}

bootstrap();
