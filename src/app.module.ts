import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { StonedataModule } from './stonedata/stonedata.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RoleModule } from './role/role.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { PermissionsModule } from './permissions/permissions.module';
import { RolePermissionsModule } from './role_permissions/role_permissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // env vars available everywhere
    }),
    DatabaseModule, // 👈 register all custom datasources
    StonedataModule,
    RoleModule,
    UsersModule,
    AuthModule,
    PermissionsModule,
    RolePermissionsModule, // 👈 feature module that uses them
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
