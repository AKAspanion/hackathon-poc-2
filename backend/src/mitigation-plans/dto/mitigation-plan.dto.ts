import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsObject,
  IsDateString,
} from 'class-validator';
import { PlanStatus } from '../../database/entities/mitigation-plan.entity';

export class CreateMitigationPlanDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  actions: string[];

  @IsEnum(PlanStatus)
  @IsOptional()
  status?: PlanStatus;

  @IsString()
  @IsOptional()
  riskId?: string;

  @IsString()
  @IsOptional()
  opportunityId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class UpdateMitigationPlanDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  actions?: string[];

  @IsEnum(PlanStatus)
  @IsOptional()
  status?: PlanStatus;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
