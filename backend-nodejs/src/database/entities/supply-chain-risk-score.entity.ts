import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('supply_chain_risk_scores')
export class SupplyChainRiskScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  oemId: string;

  /** Overall supply chain risk score 0–100 (higher = more risk). */
  @Column('decimal', { precision: 5, scale: 2 })
  overallScore: number;

  /** Score breakdown by source category (e.g. supplier/weather/news, global_news, shipping). */
  @Column('jsonb', { nullable: true })
  breakdown: Record<string, number>;

  /** Risk severity summary (counts). */
  @Column('jsonb', { nullable: true })
  severityCounts: Record<string, number>;

  /** IDs of risks included in this score. */
  @Column('simple-array', { nullable: true })
  riskIds: string[];

  @CreateDateColumn()
  createdAt: Date;
}
