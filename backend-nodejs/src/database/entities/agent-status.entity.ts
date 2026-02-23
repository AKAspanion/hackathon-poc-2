import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AgentStatus {
  IDLE = 'idle',
  MONITORING = 'monitoring',
  ANALYZING = 'analyzing',
  PROCESSING = 'processing',
  ERROR = 'error',
}

@Entity('agent_status')
export class AgentStatusEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AgentStatus,
    default: AgentStatus.IDLE,
  })
  status: AgentStatus;

  @Column('text', { nullable: true })
  currentTask: string;

  @Column('jsonb', { nullable: true })
  lastProcessedData: Record<string, any>;

  @Column({ nullable: true })
  lastDataSource: string;

  @Column({ nullable: true })
  errorMessage: string;

  @Column('int', { default: 0 })
  risksDetected: number;

  @Column('int', { default: 0 })
  opportunitiesIdentified: number;

  @Column('int', { default: 0 })
  plansGenerated: number;

  @UpdateDateColumn()
  lastUpdated: Date;

  @CreateDateColumn()
  createdAt: Date;
}
