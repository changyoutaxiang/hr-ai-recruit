import { ReactNode, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Array<'admin' | 'recruiter' | 'recruitment_lead' | 'hiring_manager'>;
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const { user, profile, loading } = useAuth();

  // 稳定 setLocation 引用，避免不必要的 effect 重新执行
  const setLocationRef = useRef(setLocation);
  useEffect(() => {
    setLocationRef.current = setLocation;
  });

  // 使用 useEffect 处理导航，避免在渲染期间执行副作用
  useEffect(() => {
    if (!loading && (!user || !profile)) {
      setLocationRef.current('/login');
    }
  }, [loading, user, profile]); // 仅依赖认证状态

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">加载中...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // 等待 useEffect 触发导航
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>访问受限</CardTitle>
            <CardDescription>
              您没有权限访问此页面
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              您的角色：<span className="font-semibold">{profile.role}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              需要的角色：<span className="font-semibold">{allowedRoles.join(', ')}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}