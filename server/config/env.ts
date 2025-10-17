const REQUIRED_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENROUTER_API_KEY',
];

function isTestMode(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST === 'true' ||
    typeof process.env.JEST_WORKER_ID !== 'undefined'
  );
}

export function ensureRequiredEnv(): void {
  const missing = REQUIRED_KEYS.filter(key => !process.env[key] || process.env[key]?.trim().length === 0);
  const useInMemoryStorage = process.env.USE_IN_MEMORY_STORAGE === 'true';
  const relaxedValidation = useInMemoryStorage || isTestMode();

  if (missing.length > 0) {
    const message = `[Config] Missing required environment variables: ${missing.join(', ')}.`;
    const hint = useInMemoryStorage
      ? '检测到 USE_IN_MEMORY_STORAGE=true，将跳过 Supabase/OpenRouter 校验。'
      : '请检查 .env 或部署环境配置。';

    console.warn(`${message} ${hint}`);

    if (!relaxedValidation) {
      throw new Error(`${message} ${hint}`);
    }
  }
}
