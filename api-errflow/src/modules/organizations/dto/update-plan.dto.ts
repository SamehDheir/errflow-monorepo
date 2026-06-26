import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdatePlanDto {
  @IsEnum(['FREE', 'PRO', 'ENTERPRISE'])
  @IsNotEmpty()
  plan!: string;
}
