import { Module } from '@nestjs/common';
import { initializeMSSQL } from '../database/dfe-data-source';

@Module({
  providers: [
    {
      provide: 'MsSqlDataSource',
      useFactory: async () => {
        return initializeMSSQL();
      },
    },
  ],
  exports: ['MsSqlDataSource'],
})
export class DatabaseModule {}
