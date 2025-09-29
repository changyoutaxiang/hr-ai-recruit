import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorCount: number;
}

/**
 * 通用错误边界组件
 * 用于捕获子组件中的JavaScript错误，记录错误信息，并显示降级UI
 */
export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;
  private previousResetKeys: Array<string | number> = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: undefined,
      errorCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // 调用父组件的错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 如果错误次数过多，可能需要采取额外措施
    if (this.state.errorCount > 3) {
      console.error('Too many errors detected, component may be in an infinite error loop');
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // 检查 resetKeys 是否改变
    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => key !== this.previousResetKeys[idx])) {
        this.resetErrorBoundary();
      }
    }

    // 如果设置了 resetOnPropsChange，则在 props 改变时重置
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary();
    }

    this.previousResetKeys = resetKeys || [];
  }

  componentWillUnmount() {
    if (this.resetTimeoutId !== null) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId !== null) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      const { fallbackComponent, isolate, level = 'component' } = this.props;
      const { error } = this.state;

      // 如果提供了自定义降级组件，使用它
      if (fallbackComponent) {
        return <>{fallbackComponent}</>;
      }

      // 根据错误级别返回不同的UI
      const errorLevelConfig = {
        page: {
          title: '页面加载失败',
          description: '抱歉，页面遇到了问题。请尝试刷新页面或返回上一页。',
          showDetails: true,
          showRefresh: true
        },
        section: {
          title: '区域加载失败',
          description: '该区域暂时无法显示，但不影响其他功能的使用。',
          showDetails: false,
          showRefresh: true
        },
        component: {
          title: '组件加载失败',
          description: '部分内容加载失败，请稍后重试。',
          showDetails: false,
          showRefresh: false
        }
      };

      const config = errorLevelConfig[level];

      return (
        <div className={`${isolate ? 'border border-destructive/50 rounded-lg p-4' : ''} ${level === 'page' ? 'min-h-[400px] flex items-center justify-center' : ''}`}>
          <Alert variant="destructive" className={level === 'page' ? 'max-w-2xl' : ''}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{config.title}</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p>{config.description}</p>

                {config.showDetails && error && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      错误详情
                    </summary>
                    <div className="mt-2 p-2 bg-destructive/10 rounded text-xs">
                      <p className="font-mono">{error.message}</p>
                      {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                        <pre className="mt-2 overflow-auto max-h-32 text-xs">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  </details>
                )}

                {config.showRefresh && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={this.resetErrorBoundary}
                      variant="outline"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      重试
                    </Button>
                    {level === 'page' && (
                      <Button
                        size="sm"
                        onClick={() => window.location.href = '/'}
                        variant="outline"
                      >
                        返回首页
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 图表专用错误边界
 */
export class ChartErrorBoundary extends Component<
  { children: ReactNode; chartName?: string },
  State
> {
  constructor(props: { children: ReactNode; chartName?: string }) {
    super(props);
    this.state = {
      hasError: false,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Chart ${this.props.chartName || 'Component'} Error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64 bg-muted/50 rounded-lg">
          <div className="text-center space-y-2">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              {this.props.chartName ? `${this.props.chartName}加载失败` : '图表加载失败'}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              重新加载
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 使用错误边界的 Hook
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  return {
    resetError,
    captureError
  };
}