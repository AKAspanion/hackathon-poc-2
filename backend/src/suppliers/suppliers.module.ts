import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from '../database/entities/supplier.entity';
import { Risk } from '../database/entities/risk.entity';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { OemsModule } from '../oems/oems.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplier, Risk]),
    OemsModule,
  ],
  controllers: [SuppliersController],
  providers: [SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
