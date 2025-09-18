import { Module } from '@nestjs/common';
import { initializeMSSQL } from './dfe-data-source';
import { initializeDFRDataSource } from 'src/database/dfr-data-source';
import { initializePostgres } from './postgres-data-source';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

// const MsSqlDataSourceProvider = {
//   provide: 'MsSqlDataSource',
//   useFactory: initializeMSSQL,
// };

const DFRDataSourceProvider = {
  provide: 'DFRDataSource',
  useFactory: initializeDFRDataSource,
};

const PostgresDataSourceProvider = {
  provide: 'PostgresDataSource',
  useFactory: initializePostgres,
};

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async () => (await initializePostgres()).options,
    }),
  ],
  providers: [
    // MsSqlDataSourceProvider,
    DFRDataSourceProvider,
    PostgresDataSourceProvider,
  ],
  exports: [
    // 'MsSqlDataSource',
    'DFRDataSource',
    'PostgresDataSource',
  ],
})
export class DatabaseModule {}
