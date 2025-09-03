import { Module } from '@nestjs/common';
import { StonedataService } from './stonedata.service';
import { StonedataController } from './stonedata.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports:[TypeOrmModule.forFeature([])],
  providers: [StonedataService],
  controllers: [StonedataController]
})
export class StonedataModule {}
