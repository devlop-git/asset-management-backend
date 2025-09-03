import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { StonedataModule } from './stonedata/stonedata.module';
import { DatabaseModule } from './stonedata/database.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // env vars available everywhere
    }),
    DatabaseModule,   // 👈 register all custom datasources
    StonedataModule,  // 👈 feature module that uses them
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
