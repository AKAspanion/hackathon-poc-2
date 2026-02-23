import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Oem } from './oem.entity';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  oemId: string | null;

  @ManyToOne(() => Oem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'oemId' })
  oem?: Oem;

  @Column()
  name: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  region: string;

  /** Comma-separated or JSON array of commodities */
  @Column('text', { nullable: true })
  commodities: string;

  /** Extra CSV columns stored as JSON for flexibility */
  @Column('jsonb', { nullable: true })
  metadata: Record<string, string>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
