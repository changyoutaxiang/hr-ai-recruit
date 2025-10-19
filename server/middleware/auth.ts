import { Request, Response, NextFunction } from 'express';
import { createClient, type User as SupabaseAuthUser } from '@supabase/supabase-js';
import { storage } from '../storage';
import type { User, InsertUser } from '@shared/schema';

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
type SupabaseUser = SupabaseAuthUser;

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  supabaseUser?: SupabaseUser;
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

    req.supabaseUser = user;

    const userProfile = await resolveOrProvisionUser(user);
    if (!userProfile) {
      return res.status(401).json({ error: 'Unauthorized: User profile missing' });
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

export async function resolveOrProvisionUser(
  supabaseUser: SupabaseUser
): Promise<User | undefined> {
  try {
    const existing = await storage.getUser(supabaseUser.id);
    if (existing) {
      return existing;
    }
  } catch (error) {
    console.error('[Auth] ⚠️ Failed to load user from storage:', error);
  }

  const email = supabaseUser.email;
  if (!email) {
    console.warn('[Auth] Supabase user has no email, cannot auto-provision profile.');
    return undefined;
  }

  const derivedName =
    (typeof supabaseUser.user_metadata?.full_name === 'string' && supabaseUser.user_metadata.full_name.trim().length > 0
      ? supabaseUser.user_metadata.full_name
      : email.split('@')[0]) || 'Recruiter';

  const payload: InsertUser = {
    email,
    password: 'supabase-managed',
    name: derivedName,
    role: 'recruiter',
  };

  try {
    const created = await storage.createUser({ ...payload, id: supabaseUser.id });
    console.log('[Auth] ✅ Auto-provisioned user profile for', email);
    return created;
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    if (/duplicate key|unique constraint/i.test(message)) {
      try {
        const existing = await storage.getUser(supabaseUser.id);
        if (existing) {
          return existing;
        }
      } catch (secondError) {
        console.error('[Auth] ⚠️ Failed to reload user after duplicate error:', secondError);
      }
    } else {
      console.error('[Auth] ❌ Failed to auto-provision user profile:', error);
    }
  }

  return undefined;
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
    req.supabaseUser = user;

    // Step 3: 尝试加载或自动创建用户配置文件
    const resolvedProfile = await resolveOrProvisionUser(user);
    if (resolvedProfile) {
      req.user = {
        id: resolvedProfile.id,
        email: resolvedProfile.email,
        role: resolvedProfile.role,
      };
      console.log('[Auth] ✅ User profile ready:', resolvedProfile.email);
    } else {
      req.user = {
        id: user.id,
        email: user.email || '',
        role: 'recruiter',
      };
      console.warn('[Auth] ⚠️ Falling back to Supabase auth data for user:', user.email);
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
