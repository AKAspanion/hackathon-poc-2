import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsObject,
} from 'class-validator';
import { RiskSeverity, RiskStatus } from '../../database/entities/risk.entity';

export class CreateRiskDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(RiskSeverity)
  @IsOptional()
  severity?: RiskSeverity;

  @IsEnum(RiskStatus)
  @IsOptional()
  status?: RiskStatus;

  @IsString()
  sourceType: string;

  @IsObject()
  @IsOptional()
  sourceData?: Record<string, any>;

  @IsString()
  @IsOptional()
  affectedRegion?: string;

  @IsString()
  @IsOptional()
  affectedSupplier?: string;

  @IsString()
  @IsOptional()
  estimatedImpact?: string;

  @IsNumber()
  @IsOptional()
  estimatedCost?: number;
}

export class UpdateRiskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RiskSeverity)
  @IsOptional()
  severity?: RiskSeverity;

  @IsEnum(RiskStatus)
  @IsOptional()
  status?: RiskStatus;

  @IsString()
  @IsOptional()
  affectedRegion?: string;

  @IsString()
  @IsOptional()
  affectedSupplier?: string;

  @IsString()
  @IsOptional()
  estimatedImpact?: string;

  @IsNumber()
  @IsOptional()
  estimatedCost?: number;
}
