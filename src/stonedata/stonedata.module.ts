import { Module } from '@nestjs/common';
import { StonedataService } from './stonedata.service';
import { StonedataController } from './stonedata.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '../database/database.module';
import { Stonedata } from './entities/stonedata.entity';
import { Media } from './entities/media.entity';
import { Stock } from './entities/stock.entity';

@Module({
  // imports:[DatabaseModule],
  imports: [
    TypeOrmModule.forFeature([Stonedata, Media, Stock]), // Registers the repositories,
    DatabaseModule
  ],
  providers: [StonedataService],
  controllers: [StonedataController]
})
export class StonedataModule {}
