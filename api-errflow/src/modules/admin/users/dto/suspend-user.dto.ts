import { IsBoolean, IsString, IsOptional } from 'class-validator';

export class SuspendUserDto {
  @IsBoolean()
  isSuspended: boolean;

  @IsString()
  @IsOptional()
  reason?: string;
}
