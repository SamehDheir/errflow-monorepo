import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  label?: string;
}
