import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MitigationPlansController } from './mitigation-plans.controller';
import { MitigationPlansService } from './mitigation-plans.service';
import { MitigationPlan } from '../database/entities/mitigation-plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MitigationPlan])],
  controllers: [MitigationPlansController],
  providers: [MitigationPlansService],
  exports: [MitigationPlansService],
})
export class MitigationPlansModule {}
