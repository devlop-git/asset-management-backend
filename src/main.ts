import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import * as fs from 'fs';
import { CustomLogger } from './logger/custom-logger.service';

async function bootstrap() {

  const app = await NestFactory.create(AppModule, { logger: false });
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // strips unknown properties
      forbidNonWhitelisted: true, // throws error if extra fields are present
      transform: true,            // converts payloads to DTO instances
    }),
  );

  const logger = new CustomLogger();
  app.useLogger(logger);

  // Apply global exception filter
  app.useGlobalFilters(new AllExceptionsFilter(logger));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
