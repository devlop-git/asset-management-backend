import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

export const MySqlDataSource = new DataSource({
  type: 'mysql',
  host: configService.get('MYSQL_HOST') || '88.80.185.122',
  port: configService.get('MYSQL_PORT') || 3306,
  username: configService.get('MYSQL_USERNAME') || 'dfredesign_db_r' ,
  password: configService.get('MYSQL_PASSWORD') || 'cbIBfdqDdctC',
  database: configService.get('MYSQL_DATABASE') || 'stone_db',
  entities: [], // No entities since we're only querying
  synchronize: false,
  logging: true,
  extra: {
    connectionLimit: 10,
    acquireTimeout: 60000,
  },
});

// Initialize the data source
export const initializeMySQL = async (): Promise<DataSource> => {
  if (!MySqlDataSource.isInitialized) {
    await MySqlDataSource.initialize();
    console.log('MySQL Data Source has been initialized!');
  }
  return MySqlDataSource;
};