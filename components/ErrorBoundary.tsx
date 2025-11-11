'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Error Boundary Component
 * Catches React rendering errors and displays a fallback UI
 * Provides error details in development and option to retry
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });

    // Hook for error reporting service
    if (typeof window !== 'undefined' && (window as any).reportError) {
      (window as any).reportError(error, { context: 'ErrorBoundary', ...errorInfo });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-md p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-semibold mb-2">
                  Error Details
                </summary>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReset}>Try Again</Button>
              <Button variant="outline" onClick={() => (window.location.href = '/')}>
                Go Home
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
