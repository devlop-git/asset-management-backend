import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

export const MsSqlDataSource = new DataSource({
  type: 'mssql',
  host: configService.get('MSSQL_HOST') || '94.237.48.126',
  port: configService.get<number>('MSSQL_PORT') || 1433,
  username: configService.get('MSSQL_USERNAME') || 'dfe_admin',
  password: configService.get('MSSQL_PASSWORD') || 'erp@123#qwert',
  database: configService.get('MSSQL_DATABASE') || 'DFELive',
  entities: [], // No entities since we're only querying
  synchronize: false,
  logging: true,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 60000,
    // requestTimeout is not a valid option here for TypeORM's mssql driver config
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
});

// Initialize the data source
export const initializeMSSQL = async (): Promise<DataSource> => {
  if (!MsSqlDataSource.isInitialized) {
    await MsSqlDataSource.initialize();
    console.log('MS SQL Data Source has been initialized!');
  }
  return MsSqlDataSource;
};