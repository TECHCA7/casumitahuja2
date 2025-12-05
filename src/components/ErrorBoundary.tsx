import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
          <div className="bg-destructive/10 p-4 rounded-full mb-4">
            <AlertTriangle className="w-12 h-12 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6 max-w-md">
            We apologize for the inconvenience. An unexpected error has occurred.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => window.location.reload()} variant="default">
              Reload Page
            </Button>
            <Button onClick={() => window.location.href = "/"} variant="outline">
              Go to Home
            </Button>
          </div>
          {import.meta.env.MODE === "development" && this.state.error && (
            <div className="mt-8 p-4 bg-muted rounded-lg text-left max-w-2xl w-full overflow-auto">
              <p className="font-mono text-sm text-destructive">
                {this.state.error.toString()}
              </p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
