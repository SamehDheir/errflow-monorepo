import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  githubOwner!: string;

  @IsString()
  @IsNotEmpty()
  githubRepo!: string;

  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9_-]+$/)
  defaultBranch?: string;

  @IsString()
  @IsOptional()
  githubToken?: string;
}
