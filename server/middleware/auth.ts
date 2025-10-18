import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// 环境变量验证和详细错误提示
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// 验证必需的环境变量
if (!supabaseUrl || !supabaseServiceKey) {
  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  console.error('[Auth Middleware] ❌ 致命错误: 缺少必需的环境变量:', missing.join(', '));
  console.error('[Auth Middleware] 💡 请在 Vercel Dashboard → Settings → Environment Variables 中配置');
  console.error('[Auth Middleware] 📋 需要配置的变量:', {
    SUPABASE_URL: 'https://xxx.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'eyJxxx...',
  });
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.substring(7);

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    req.user = {
      id: userProfile.id,
      email: userProfile.email,
      role: userProfile.role,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// 新的中间件：允许用户初始化（即使用户在数据库中不存在）
export async function requireAuthWithInit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Step 1: 验证 Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[Auth] ⚠️ Missing or invalid Authorization header');
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.substring(7);

    // Step 2: 验证 Supabase 认证 token
    console.log('[Auth] 🔐 Verifying Supabase token...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError) {
      console.error('[Auth] ❌ Supabase auth error:', authError.message);
      return res.status(401).json({ error: 'Unauthorized: Invalid token', details: authError.message });
    }

    if (!user) {
      console.error('[Auth] ❌ No user returned from Supabase');
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    console.log('[Auth] ✅ Token valid for user:', user.id);

    // Step 3: 尝试从数据库获取用户配置文件
    try {
      const { data: userProfile, error: dbError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', user.id)
        .single();

      if (dbError) {
        // 数据库查询失败（可能是配置问题）
        console.error('[Auth] ⚠️ Database query error:', dbError.message);
        console.error('[Auth] 💡 Hint: Check if SUPABASE_SERVICE_ROLE_KEY is configured in Vercel');

        // 降级处理：使用 Supabase Auth 信息
        req.user = {
          id: user.id,
          email: user.email || '',
          role: 'recruiter',
        };
        console.warn('[Auth] ⚠️ Using fallback user data from Supabase Auth');
      } else if (userProfile) {
        // 用户存在，设置用户信息
        req.user = {
          id: userProfile.id,
          email: userProfile.email,
          role: userProfile.role,
        };
        console.log('[Auth] ✅ User profile loaded:', userProfile.email);
      } else {
        // 用户不存在，但 Supabase 认证有效，设置基本用户信息
        req.user = {
          id: user.id,
          email: user.email || '',
          role: 'recruiter', // 默认角色
        };
        console.log('[Auth] ℹ️ User not in database, using auth data:', user.email);
      }
    } catch (dbException: any) {
      // 捕获数据库异常（如连接失败）
      console.error('[Auth] ❌ Database exception:', dbException.message);
      console.error('[Auth] 💡 This usually means DATABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing');

      // 降级处理：使用 Supabase Auth 信息
      req.user = {
        id: user.id,
        email: user.email || '',
        role: 'recruiter',
      };
      console.warn('[Auth] ⚠️ Database unavailable, using fallback user data');
    }

    next();
  } catch (error: any) {
    console.error('[Auth] ❌ Unexpected error in auth middleware:', error.message);
    console.error('[Auth] Stack trace:', error.stack);
    return res.status(500).json({
      error: 'Internal server error during authentication',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
}