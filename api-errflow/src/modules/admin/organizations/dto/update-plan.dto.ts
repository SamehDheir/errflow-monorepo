import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { Plan } from '@prisma/client';

export class UpdatePlanDto {
  @IsEnum(Plan)
  plan: Plan;

  @IsInt()
  @IsOptional()
  fixesLimit?: number;
}
