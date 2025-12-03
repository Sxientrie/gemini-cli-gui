import React, { Component, ErrorInfo, ReactNode } from 'react';

// error boundary
// catches react render errors and displays a fallback ui.

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-zinc-950 text-red-500 p-8 flex flex-col items-center justify-center overflow-auto">
          <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
          <div className="bg-zinc-900 p-4 rounded-lg border border-red-900/50 max-w-4xl w-full">
            <h2 className="text-lg font-mono mb-2">{this.state.error?.toString()}</h2>
            <pre className="text-xs font-mono text-zinc-500 whitespace-pre-wrap">
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
          <button 
            className="mt-8 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors"
            onClick={() => window.location.reload()}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
