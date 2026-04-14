import React from "react";

export interface RuntimeErrorBoundaryProps {
  children: React.ReactNode;
  description?: string;
  resetKey?: string;
  scope?: string;
  title?: string;
}

interface RuntimeErrorBoundaryState {
  error: Error | null;
}

export function normalizeRuntimeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string" && error.trim()) {
    return new Error(error);
  }

  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error("Unknown runtime error");
  }
}

export function RuntimeErrorFallback({
  description = "A runtime error interrupted rendering. The fallback below keeps the app visible while we log the failure.",
  error,
  title = "Something went wrong",
}: {
  description?: string;
  error: Error;
  title?: string;
}) {
  return (
    <div className="runtime-error-shell" role="alert">
      <div className="runtime-error-card glass-card">
        <p className="runtime-error-label">Runtime Error</p>
        <div className="runtime-error-status">App is running</div>
        <h1 className="runtime-error-title font-display">{title}</h1>
        <p className="runtime-error-copy">{description}</p>
        <pre className="runtime-error-message">{error.message}</pre>
        <button
          className="button button--outline runtime-error-action"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.reload();
            }
          }}
          type="button"
        >
          Reload App
        </button>
      </div>
    </div>
  );
}

export class RuntimeErrorBoundary extends React.Component<
  RuntimeErrorBoundaryProps,
  RuntimeErrorBoundaryState
> {
  state: RuntimeErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): RuntimeErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const scope = this.props.scope || "app";
    console.error(`[RuntimeErrorBoundary:${scope}]`, error);
    if (errorInfo.componentStack) {
      console.error(errorInfo.componentStack);
    }
  }

  componentDidUpdate(prevProps: RuntimeErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <RuntimeErrorFallback
          description={this.props.description}
          error={this.state.error}
          title={this.props.title}
        />
      );
    }

    return this.props.children;
  }
}
