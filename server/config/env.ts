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
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = isTestMode();

  if (missing.length > 0) {
    const message = `[Config] Missing required environment variables: ${missing.join(', ')}.`;

    // 生产环境必须严格校验，不允许任何宽松模式
    if (isProduction) {
      if (useInMemoryStorage) {
        console.error('[Config] ⚠️ CRITICAL: USE_IN_MEMORY_STORAGE 在生产环境被设置为 true，这是不安全的配置！');
      }
      throw new Error(`${message} 生产环境必须配置所有必需的环境变量。`);
    }

    // 开发/测试环境：仅在测试模式或内存存储模式下宽松校验
    const relaxedValidation = useInMemoryStorage || isTest;
    const hint = useInMemoryStorage
      ? '检测到 USE_IN_MEMORY_STORAGE=true，将跳过 Supabase/OpenRouter 校验（仅限开发环境）。'
      : isTest
      ? '测试模式已启用，跳过环境变量校验。'
      : '请检查 .env 文件配置。';

    console.warn(`${message} ${hint}`);

    if (!relaxedValidation) {
      throw new Error(`${message} ${hint}`);
    }
  } else {
    // 所有必需环境变量都存在
    if (isProduction && useInMemoryStorage) {
      console.warn('[Config] ⚠️ WARNING: USE_IN_MEMORY_STORAGE 在生产环境不应设置为 true');
    }
  }
}
