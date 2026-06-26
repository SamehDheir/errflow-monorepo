type Env = Record<string, unknown>;

const REQUIRED: ReadonlyArray<string> = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'ENCRYPTION_KEY',
  'GROQ_API_KEY',
];

export function validateEnv(config: Env): Env {
  const missing = REQUIRED.filter(k => !config[k]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const jwtSecret = config['JWT_SECRET'] as string;
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }

  const jwtRefresh = config['JWT_REFRESH_SECRET'] as string;
  if (jwtRefresh.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters');
  }

  if (jwtSecret === jwtRefresh) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different values');
  }

  const encKey = config['ENCRYPTION_KEY'] as string;
  if (!/^[0-9a-f]{64}$/i.test(encKey)) {
    throw new Error('ENCRYPTION_KEY must be exactly 64 lowercase hex characters (openssl rand -hex 32)');
  }

  return config;
}
