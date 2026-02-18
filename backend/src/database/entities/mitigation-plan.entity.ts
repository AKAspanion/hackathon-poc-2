import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Risk } from './risk.entity';
import { Opportunity } from './opportunity.entity';

export enum PlanStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('mitigation_plans')
export class MitigationPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('text', { array: true })
  actions: string[];

  @Column({
    type: 'enum',
    enum: PlanStatus,
    default: PlanStatus.DRAFT,
  })
  status: PlanStatus;

  @Column({ nullable: true })
  riskId: string;

  @ManyToOne(() => Risk, (risk) => risk.mitigationPlans, { nullable: true })
  @JoinColumn({ name: 'riskId' })
  risk: Risk;

  @Column({ nullable: true })
  opportunityId: string;

  @ManyToOne(() => Opportunity, (opportunity) => opportunity.mitigationPlans, {
    nullable: true,
  })
  @JoinColumn({ name: 'opportunityId' })
  opportunity: Opportunity;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  assignedTo: string;

  @Column({ nullable: true })
  dueDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
