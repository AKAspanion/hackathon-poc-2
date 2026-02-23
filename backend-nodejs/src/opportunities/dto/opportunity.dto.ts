import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsObject,
} from 'class-validator';
import {
  OpportunityType,
  OpportunityStatus,
} from '../../database/entities/opportunity.entity';

export class CreateOpportunityDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(OpportunityType)
  type: OpportunityType;

  @IsEnum(OpportunityStatus)
  @IsOptional()
  status?: OpportunityStatus;

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
  potentialBenefit?: string;

  @IsNumber()
  @IsOptional()
  estimatedValue?: number;
}

export class UpdateOpportunityDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(OpportunityType)
  @IsOptional()
  type?: OpportunityType;

  @IsEnum(OpportunityStatus)
  @IsOptional()
  status?: OpportunityStatus;

  @IsString()
  @IsOptional()
  affectedRegion?: string;

  @IsString()
  @IsOptional()
  potentialBenefit?: string;

  @IsNumber()
  @IsOptional()
  estimatedValue?: number;
}
