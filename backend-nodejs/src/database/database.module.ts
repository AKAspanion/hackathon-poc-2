import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Risk } from './entities/risk.entity';
import { Opportunity } from './entities/opportunity.entity';
import { MitigationPlan } from './entities/mitigation-plan.entity';
import { AgentStatusEntity } from './entities/agent-status.entity';
import { Supplier } from './entities/supplier.entity';
import { Oem } from './entities/oem.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Risk,
      Opportunity,
      MitigationPlan,
      AgentStatusEntity,
      Supplier,
      Oem,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
