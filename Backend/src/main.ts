import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import helmet from 'helmet';
import * as qs from 'qs';
import { HttpExceptionFilter } from 'src/filter/http-exception.filter';
import { LoggingInterceptor } from 'src/interceptor/logging.interceptor';
import { TransformInterceptor } from 'src/interceptor/transform.interceptor';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const reflector = app.get(Reflector);

  // Raw body parser for Stripe webhooks
  app.use('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }));

  // Configure body parsing for different content types
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      // whitelist: true (remove all properties that do not have any decorators that define in DTO)
      transform: true, // convert payload to DTO
      transformOptions: {
        enableImplicitConversion: true, // Cho phép Nest tự ép string -> boolean/number
      },
      whitelist: true,
    }),
  );

  app.useGlobalInterceptors(
    new TransformInterceptor(reflector),
    new LoggingInterceptor(),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: ['1'],
  });

  app.use(cookieParser());

  app.enableCors({
    origin: 'http://localhost:8000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    credentials: true,
  });

  app.use(helmet());

  app.set('query parser', (str) => qs.parse(str));

  const config = new DocumentBuilder()
    .setTitle('English Learning API')
    .setDescription('API documentation for English Learning application')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'Bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'token',
    )
    .addCookieAuth('refresh_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'refresh_token',
      description: 'Refresh token stored in HTTP-only cookie',
    })
    .addSecurityRequirements('token')
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('User Profile', 'User profile management')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
  await app.listen(port);
}
void bootstrap();
