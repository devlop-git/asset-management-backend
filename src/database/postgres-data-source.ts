import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import * as path from 'path';

config();

const configService = new ConfigService();

export const PostgresDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('POSTGRES_HOST'),
  port: configService.get('POSTGRES_PORT'),
  username: configService.get('POSTGRES_USERNAME'),
  password: configService.get('POSTGRES_PASSWORD'),
  database: configService.get('POSTGRES_DATABASE'),
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false, // MUST be false when using migrations
  logging: true, // Enable logging to see what's happening
  migrationsTableName: 'migrations', // Name of the table that tracks migrations
});

export const initializePostgres = async (): Promise<DataSource> => {
  if (!PostgresDataSource.isInitialized) {
    await PostgresDataSource.initialize();
    console.log('✅ PostgreSQL Data Source has been initialized!');
  }
  return PostgresDataSource;
};
