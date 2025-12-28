import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger/OpenAPI setup
  const config = new DocumentBuilder()
    .setTitle('Common API Platform')
    .setDescription(
      'Multi-tenant B2B API for Identity, Wallet, Billing, and Jobs',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('https://api.{appId}.com/v1', 'App-specific tenant', {
      appId: {
        default: 'demo',
        description: 'Application identifier',
      },
    })
    .addServer(
      'https://platform.api.your.com/v1',
      'Platform super admin',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  // Start server
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
🚀 Common API Platform is running on: http://localhost:${port}
📚 Swagger UI available at: http://localhost:${port}/api-docs
  `);
}

bootstrap();
