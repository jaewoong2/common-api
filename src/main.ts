import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { AppLogger } from "./core/logger/logger.service";

interface HotModule extends NodeModule {
  hot?: {
    accept: () => void;
    dispose: (callback: () => void | Promise<void>) => void;
  };
}

let runningApp: NestFastifyApplication | null = null;

/**
 * Applies global middleware, filters, and interceptors.
 */
function configureHttp(app: NestFastifyApplication): void {
  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") || [
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
  });

  app.useLogger(app.get(AppLogger));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new HttpExceptionFilter(httpAdapterHost));

  // Register LoggingInterceptor BEFORE ResponseInterceptor for accurate timing
  const configService = app.get(ConfigService);
  app.useGlobalInterceptors(new LoggingInterceptor(configService));
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.enableShutdownHooks();
}

/**
 * Registers Swagger documentation endpoint.
 */
function setupSwaggerDocs(app: NestFastifyApplication): void {
  const config = new DocumentBuilder()
    .setTitle("Common API Platform")
    .setDescription("Multi-tenant API for Identity, Wallet, Billing, and Jobs")
    .setVersion("1.0")
    .addBearerAuth()
    .addTag("auth", "Authentication & Authorization")
    .addTag("users", "User Management")
    .addTag("wallet", "Wallet & Point Management")
    .addTag("billing", "Product & Order Management")
    .addTag("job", "Async Job Management")
    .addTag("platform", "Platform & App Management")
    .addTag("admin", "Admin Operations")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

/**
 * Closes Fastify server on HMR reload to avoid EADDRINUSE during watch mode.
 */
function enableHotReload(app: NestFastifyApplication): void {
  const hotModule = module as HotModule;
  if (!hotModule.hot) {
    return;
  }

  hotModule.hot.accept();
  hotModule.hot.dispose(async () => {
    await app.close();
    runningApp = null;
  });
}

/**
 * Bootstraps the Nest application for ECS/Fargate runtime.
 */
async function bootstrap() {
  if (runningApp) {
    await runningApp.close();
    runningApp = null;
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  runningApp = app;

  configureHttp(app);
  setupSwaggerDocs(app);

  const port = process.env.PORT ? Number(process.env.PORT) : 8000;
  await app.listen(port, "0.0.0.0");

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(
    `📚 Swagger UI is available at: http://localhost:${port}/api-docs`,
  );

  enableHotReload(app);
}

bootstrap();
