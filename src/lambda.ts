import { ValidationPipe } from "@nestjs/common";
import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import serverless from "@fastify/aws-lambda";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { AppLogger } from "./core/logger/logger.service";

let cachedProxy: ReturnType<typeof serverless> | undefined;

/**
 * Initializes Nest app once and returns cached AWS Lambda proxy handler.
 */
async function bootstrapLambdaProxy() {
  const app = await NestFactory.create(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });
  app.useLogger(app.get(AppLogger));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new HttpExceptionFilter(httpAdapterHost));
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableShutdownHooks();
  await app.init();
  return serverless(app.getHttpAdapter().getInstance());
}

/**
 * AWS Lambda entrypoint that lazily boots and reuses the Nest proxy.
 */
export const handler = async (event: unknown, context: unknown) => {
  if (!cachedProxy) {
    cachedProxy = await bootstrapLambdaProxy();
  }

  return cachedProxy(event, context, () => null);
};
