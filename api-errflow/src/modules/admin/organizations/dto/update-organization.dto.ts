import { IsString, IsOptional, IsEnum, IsInt } from 'class-validator';
import { Plan } from '@prisma/client';

export class UpdateOrganizationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsEnum(Plan)
  @IsOptional()
  plan?: Plan;

  @IsInt()
  @IsOptional()
  fixesLimit?: number;
}
