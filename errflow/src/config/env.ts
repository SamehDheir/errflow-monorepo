import { z } from 'zod';

const envSchema = z.object({
  ERRFLOW_API_KEY: z.string().min(1, 'ERRFLOW_API_KEY is required'),
  ERRFLOW_ENV: z.string().default('production'),
  ERRFLOW_API_URL: z
    .string()
    .default('https://api.errflow.dev/api/ingest')
    .refine(
      (url) => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'ERRFLOW_API_URL must be a valid URL' },
    ),
  ERRFLOW_DISABLED: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
  ERRFLOW_INCLUDE_MEMORY: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
  ERRFLOW_DEBUG: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true'),
});

type Env = z.infer<typeof envSchema>;

let cachedConfig: Env | null = null;

export function loadEnv(): Env {
  if (cachedConfig) {
    return cachedConfig;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    throw new Error(`Environment validation failed: ${errors}`);
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export function setConfig(config: {
  apiKey: string;
  env?: string;
  apiUrl?: string;
  disabled?: boolean;
  includeMemory?: boolean;
  debug?: boolean;
}): void {
  // Validate apiUrl if provided
  if (config.apiUrl) {
    try {
      new URL(config.apiUrl);
    } catch {
      throw new Error(`Invalid apiUrl: "${config.apiUrl}" is not a valid URL`);
    }
  }

  if (!config.apiKey || config.apiKey.trim().length === 0) {
    throw new Error('apiKey is required and cannot be empty');
  }

  cachedConfig = {
    ERRFLOW_API_KEY: config.apiKey.trim(),
    ERRFLOW_ENV: config.env || 'production',
    ERRFLOW_API_URL: config.apiUrl || 'https://api.errflow.dev/api/ingest',
    ERRFLOW_DISABLED: config.disabled ?? false,
    ERRFLOW_INCLUDE_MEMORY: config.includeMemory ?? false,
    ERRFLOW_DEBUG: config.debug ?? false,
  };
}

export function getConfig(): Env {
  if (!cachedConfig) {
    return loadEnv();
  }
  return cachedConfig;
}

export function isDisabled(): boolean {
  return getConfig().ERRFLOW_DISABLED;
}

export function resetConfig(): void {
  cachedConfig = null;
}