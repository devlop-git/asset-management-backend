import { Module } from '@nestjs/common';
import { initializeMSSQL } from '../database/dfe-data-source';
import { initializeDFRDataSource } from 'src/database/dfr-data-source';
import { initializePostgres } from '../database/postgres-data-source';

@Module({
  providers: [
    {
      provide: 'MsSqlDataSource',
      useFactory: async () => initializeMSSQL(),
    },
    {
      provide: 'DFRDataSource',
      useFactory: async () => initializeDFRDataSource(),
    },
    {
      provide: 'PostgresDataSource',
      useFactory: async () => initializePostgres(),
    },
  ],
  exports: ['MsSqlDataSource','DFRDataSource','PostgresDataSource'],
})
export class DatabaseModule {}
