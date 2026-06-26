import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsIn,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";

export class SnippetLineDto {
  @IsNumber() lineNumber!: number;
  @IsString() content!: string;
  @IsBoolean() isErrorLine!: boolean;
}

export class CodeContextItemDto {
  @IsString() @IsNotEmpty() file!: string;
  @IsNumber() line!: number;
  @IsOptional() @IsString() functionName?: string | null;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SnippetLineDto)
  snippet!: SnippetLineDto[];
}

export class GitBlameDto {
  @IsString() author!: string;
  @IsString() authorEmail!: string;
  @IsString() commitHash!: string;
  @IsString() commitMessage!: string;
  @IsDateString() committedAt!: string;
}

export class GitDiffDto {
  @IsString() commitHash!: string;
  @IsString() commitMessage!: string;
  @IsString() author!: string;
  @IsDateString() committedAt!: string;
  @IsString() diff!: string;
}

export class RequestContextDto {
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) bodyKeys?: string[];
  @IsOptional() userId?: string | number;
  @IsOptional() @IsString() traceId?: string;
}

export class BreadcrumbDto {
  @IsString() @IsNotEmpty() message!: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsIn(["debug", "info", "warning", "error"]) level?:
    | "debug"
    | "info"
    | "warning"
    | "error";
  @IsDateString() timestamp!: string;
  @IsOptional() @IsObject() data?: Record<string, unknown>;
}

export class RuntimeDto {
  @IsString() node!: string;
  @IsString() platform!: string;
  @IsString() arch!: string;
  @IsString() cwd!: string;
  @IsNumber() pid!: number;
  @IsOptional() @IsObject() memory?: NodeJS.MemoryUsage;
}

export class SeverityHintsDto {
  @IsOptional() @IsNumber() affectedUsers?: number;
  @IsOptional() @IsNumber() occurrencesLastHour?: number;
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() reason?: string;
}

export class IngestDto {
  @IsString() @IsNotEmpty() fingerprint!: string;
  @IsString() @IsNotEmpty() errorName!: string;
  @IsOptional() @IsString() errorCode?: string;
  @IsString() @IsNotEmpty() message!: string;
  @IsString() @IsNotEmpty() stack!: string;
  @IsIn(["critical", "high", "medium", "low"]) severity!:
    | "critical"
    | "high"
    | "medium"
    | "low";
  @IsBoolean() isRegression!: boolean;
  @IsString() @IsNotEmpty() environment!: string;
  @IsDateString() timestamp!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CodeContextItemDto)
  codeContext!: CodeContextItemDto[];
  @IsOptional()
  @ValidateNested()
  @Type(() => GitBlameDto)
  gitBlame?: GitBlameDto | null;
  @IsOptional()
  @ValidateNested()
  @Type(() => GitDiffDto)
  recentDiff?: GitDiffDto | null;
  @IsOptional()
  @ValidateNested()
  @Type(() => RequestContextDto)
  request?: RequestContextDto;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreadcrumbDto)
  breadcrumbs?: BreadcrumbDto[];
  @ValidateNested() @Type(() => RuntimeDto) runtime!: RuntimeDto;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeverityHintsDto)
  severityHints?: SeverityHintsDto;
}
