import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdateApiKeyDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  label?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
