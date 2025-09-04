import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

export const DFRDataSource = new DataSource({
  type: 'mysql',
  host: configService.get('DFR_HOST') || '88.80.185.122',
  port: Number(configService.get<number>('DFR_PORT')) || 3306,
  username: configService.get('DFR_USERNAME') || 'dfredesign_db_r',
  password: configService.get('DFR_PASSWORD') || 'cbIBfdqDdctC',
  database: configService.get('DFR_DATABASE') || 'stone_db',
  entities: [],
  synchronize: false,
  logging: false
});

// Initialize the reporting data source
export const initializeDFRDataSource = async (): Promise<DataSource> => {
  if (!DFRDataSource.isInitialized) {
    await DFRDataSource.initialize();
    console.log('DFR Data Source has been initialized!');
  }
  return DFRDataSource;
};
