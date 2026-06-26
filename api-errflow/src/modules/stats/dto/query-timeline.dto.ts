import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryTimelineDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  days?: number = 30;
}
