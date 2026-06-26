import { IsOptional, IsEnum } from 'class-validator';
import { PrStatus } from '@prisma/client';

export class QueryPullRequestsDto {
  @IsOptional()
  @IsEnum(PrStatus)
  status?: PrStatus;
}
