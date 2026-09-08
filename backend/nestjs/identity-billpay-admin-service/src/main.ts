import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

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

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseTransformInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('NPST BCB — Auth Service')
    .setDescription(
      'Bharat Banking authentication APIs. All endpoints use POST.\n\n' +
        '**Flow:**\n' +
        '1. `POST /auth/login` — get accessToken\n' +
        '2. Click **Authorize** and paste the accessToken\n' +
        '3. Call protected endpoints\n' +
        '4. `POST /auth/logout` — revoke refresh token when done',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the accessToken from POST /auth/login',
      },
      'access-token',
    )
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 3000;
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
}

bootstrap();
