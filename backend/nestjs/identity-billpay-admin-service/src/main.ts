// Must run before AppModule is imported below: app.module.ts reads process.env.AUTH_MOCK_MODE
// at module-decoration time (synchronously, on import) to pick its guards, which is earlier
// than @nestjs/config's ConfigModule.forRoot() would otherwise load the .env file.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { normalizeBearerMiddleware } from './common/middleware/normalize-bearer.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const globalPrefix = process.env.API_GLOBAL_PREFIX ?? 'identity/api/v1';
  app.setGlobalPrefix(globalPrefix);

  const enableHttpsHeaders = process.env.ENABLE_HTTPS_HEADERS === 'true';
  if (enableHttpsHeaders) {
    app.use(helmet());
  } else {
    app.use(
      helmet({
        hsts: false,
        crossOriginOpenerPolicy: false,
        contentSecurityPolicy: false,
      }),
    );
  }
  app.enableCors();
  app.use(normalizeBearerMiddleware);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseTransformInterceptor());

  const swaggerBuilder = new DocumentBuilder().setTitle('NPST BCB — Auth Service');
  if (process.env.APP_PUBLIC_BASE_URL) {
    swaggerBuilder.addServer(process.env.APP_PUBLIC_BASE_URL);
  }
  const swaggerDocument = SwaggerModule.createDocument(
    app,
    swaggerBuilder
      .setDescription(
        'Bharat Banking authentication APIs. All endpoints use POST.\n\n' +
          '**Audiences:**\n' +
          '- `[Mobile / Customer]` — mobile app endpoints for retail/corporate customers (use Keycloak client `mobile-app`)\n' +
          '- `[Admin]` — admin web portal for bank staff (use Keycloak client `admin-web`)\n\n' +
          '**Auth flow:**\n' +
          '1. `POST /auth/login` — copy **`accessToken`** (not `refreshToken`)\n' +
          '2. Click **Authorize** and paste the token only (no `Bearer` prefix)\n' +
          '3. Call protected endpoints within 5 minutes\n' +
          '4. `POST /auth/logout` when done',
      )
      .setVersion('1.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Paste **accessToken** from POST /auth/login only. Do not paste refreshToken or the word Bearer.',
      })
      .build(),
  );
  SwaggerModule.setup(`${globalPrefix}/docs`, app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3000;
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
}

bootstrap();
