import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import * as fs from 'fs';

async function bootstrap() {

  const httpsOptions = {
    key: fs.readFileSync('./privkey1.pem'),
    cert: fs.readFileSync('./fullchain1.pem'),
  };

  const app = await NestFactory.create(AppModule,{httpsOptions});
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // strips unknown properties
      forbidNonWhitelisted: true, // throws error if extra fields are present
      transform: true,            // converts payloads to DTO instances
    }),
  );

   // Apply global exception filter
   app.useGlobalFilters(new AllExceptionsFilter());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
