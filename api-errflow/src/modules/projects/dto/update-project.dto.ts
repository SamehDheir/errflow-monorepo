import { IsString, IsOptional, IsNotEmpty, Matches } from 'class-validator';

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  githubOwner?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  githubRepo?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9_-]+$/)
  defaultBranch?: string;

  @IsString()
  @IsOptional()
  githubToken?: string;
}
