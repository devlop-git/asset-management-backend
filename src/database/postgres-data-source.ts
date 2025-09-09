import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

const configService = new ConfigService();

export const PostgresDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('POSTGRES_HOST'),
  port: Number(configService.get('POSTGRES_PORT')),
  username: configService.get('POSTGRES_USERNAME'),
  password: configService.get('POSTGRES_PASSWORD'),
  database: configService.get('POSTGRES_DATABASE'),
  
  entities:
    [
      (process.env.NODE_ENV || 'production') === 'production'
        ? path.join(__dirname, '..', '..', 'dist', '**', '*.entity.js')
        : path.join(__dirname, '..', '..', 'src', '**', '*.entity.ts'),
    ],
  migrations:
    [
      (process.env.NODE_ENV || 'production') === 'production'
        ? path.join(__dirname, '..', '..', 'dist', 'database', 'migrations', '*.js')
        : path.join(__dirname, '..', '..', 'src', 'database', 'migrations', '*.ts'),
    ],
  synchronize: false,
  logging: true,
  migrationsTableName: 'migrations',
  
});

export const initializePostgres = async (): Promise<DataSource> => {
  if (!PostgresDataSource.isInitialized) {
    await PostgresDataSource.initialize();
    console.log('✅ PostgreSQL Data Source has been initialized!');
  }
  return PostgresDataSource;
};
