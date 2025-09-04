import { Module } from '@nestjs/common';
import { initializeMSSQL } from '../database/dfe-data-source';
import { initializeDFRDataSource } from 'src/database/dfr-data-source';

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
  ],
  exports: ['MsSqlDataSource','DFRDataSource'],
})
export class DatabaseModule {}
