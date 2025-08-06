import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import helmet from 'helmet';
import * as qs from 'qs';
import { DatabaseService } from 'src/database/database.service';
import { HttpExceptionFilter } from 'src/filter/http-exception.filter';
import { LoggingInterceptor } from 'src/interceptor/logging.interceptor';
import { TransformInterceptor } from 'src/interceptor/transform.interceptor';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const reflector = app.get(Reflector);

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

  // useGlobalGuards() method is used to apply the JwtAuthGuard to all routes in the application.
  // app.useGlobalGuards(new JwtAuthGuard(reflector));

  app.useGlobalInterceptors(
    new TransformInterceptor(reflector),
    new LoggingInterceptor(),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    // prefix: 'api/v',
    defaultVersion: ['1'],
  });

  app.use(cookieParser());

  app.enableCors({
    // origin: true (cho phép kết nối từ cùng origin với server)
    origin: 'http://localhost:8000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    credentials: true,
  });

  app.use(helmet());

  app.set('query parser', (str) => qs.parse(str));

  // Raw body parser for Stripe webhooks
  app.use(
    bodyParser.json({
      verify: (req: express.Request, res: express.Response, buf: Buffer) => {
        const url = req.originalUrl;
        // Check if URL is string and includes webhook path
        if (
          typeof url === 'string' &&
          url.includes('/api/payments/stripe/webhook')
        ) {
          req.rawBody = buf;
        }
      },
    }),
  );

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

  const dbService = app.get(DatabaseService);
  await dbService.createAdminUser();
  await dbService.seedSampleData();
  await app.listen(port);
}
void bootstrap();
