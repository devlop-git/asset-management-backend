import { Module } from '@nestjs/common';
import { StonedataService } from './stonedata.service';
import { StonedataController } from './stonedata.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from './database.module';

@Module({
  imports:[DatabaseModule],
  providers: [StonedataService],
  controllers: [StonedataController]
})
export class StonedataModule {}
