import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { DataSourceModule } from './data-sources/data-source.module';
import { AgentModule } from './agent/agent.module';
import { RisksModule } from './risks/risks.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { MitigationPlansModule } from './mitigation-plans/mitigation-plans.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { OemsModule } from './oems/oems.module';
import { GlobalJwtAuthGuard } from './oems/global-jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'supply_chain',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: false,
      }),
    }),
    DatabaseModule,
    DataSourceModule,
    AgentModule,
    RisksModule,
    OpportunitiesModule,
    MitigationPlansModule,
    OemsModule,
    SuppliersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: GlobalJwtAuthGuard },
  ],
})
export class AppModule {}
