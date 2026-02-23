import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { MitigationPlan } from './mitigation-plan.entity';

export enum OpportunityType {
  COST_SAVING = 'cost_saving',
  TIME_SAVING = 'time_saving',
  QUALITY_IMPROVEMENT = 'quality_improvement',
  MARKET_EXPANSION = 'market_expansion',
  SUPPLIER_DIVERSIFICATION = 'supplier_diversification',
}

export enum OpportunityStatus {
  IDENTIFIED = 'identified',
  EVALUATING = 'evaluating',
  IMPLEMENTING = 'implementing',
  REALIZED = 'realized',
  EXPIRED = 'expired',
}

@Entity('opportunities')
export class Opportunity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: OpportunityType,
  })
  type: OpportunityType;

  @Column({
    type: 'enum',
    enum: OpportunityStatus,
    default: OpportunityStatus.IDENTIFIED,
  })
  status: OpportunityStatus;

  @Column()
  sourceType: string; // 'weather', 'news', 'traffic', 'market'

  @Column('jsonb', { nullable: true })
  sourceData: Record<string, any>;

  @Column({ nullable: true })
  affectedRegion: string;

  @Column({ nullable: true })
  potentialBenefit: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  estimatedValue: number;

  /** OEM this opportunity belongs to (when produced by OEM-scoped agent run) */
  @Column({ type: 'uuid', nullable: true })
  oemId: string | null;

  @OneToMany(() => MitigationPlan, (plan) => plan.opportunity, {
    cascade: true,
  })
  mitigationPlans: MitigationPlan[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
