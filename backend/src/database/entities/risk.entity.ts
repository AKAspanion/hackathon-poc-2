import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { MitigationPlan } from './mitigation-plan.entity';

export enum RiskSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum RiskStatus {
  DETECTED = 'detected',
  ANALYZING = 'analyzing',
  MITIGATING = 'mitigating',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive',
}

@Entity('risks')
export class Risk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: RiskSeverity,
    default: RiskSeverity.MEDIUM,
  })
  severity: RiskSeverity;

  @Column({
    type: 'enum',
    enum: RiskStatus,
    default: RiskStatus.DETECTED,
  })
  status: RiskStatus;

  @Column()
  sourceType: string; // 'weather', 'news', 'traffic', 'market'

  @Column('jsonb', { nullable: true })
  sourceData: Record<string, any>;

  @Column({ nullable: true })
  affectedRegion: string;

  @Column({ nullable: true })
  affectedSupplier: string;

  @Column({ nullable: true })
  estimatedImpact: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  estimatedCost: number;

  @OneToMany(() => MitigationPlan, (plan) => plan.risk, { cascade: true })
  mitigationPlans: MitigationPlan[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
