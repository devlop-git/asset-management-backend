import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StonedataModule } from './stonedata/stonedata.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // available everywhere
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
       synchronize: false, // ❌ Important: disable in production, we use migrations
      }),
    }),
    StonedataModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
