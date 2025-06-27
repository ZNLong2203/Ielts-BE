import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { DatabaseService } from 'src/database/database.service';
import { HttpExceptionFilter } from 'src/filter/http-exception.filter';
import { LoggingInterceptor } from 'src/interceptor/logging.interceptor';
import { TransformInterceptor } from 'src/interceptor/transform.interceptor';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);

  app.useGlobalPipes(
    new ValidationPipe({
      // whitelist: true (remove all properties that do not have any decorators that define in DTO)
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
    .addSecurityRequirements('token')
    // .addTag('cats')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, documentFactory, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const dbService = app.get(DatabaseService);
  await dbService.createAdminUser();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
