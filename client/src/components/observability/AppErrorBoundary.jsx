import React from "react";
import ErrorFallback from "./ErrorFallback";
import { captureClientException } from "../../observability/errorTracker";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    captureClientException(error, {
      level: "fatal",
      tags: {
        source: "react.error_boundary",
      },
      extra: {
        componentStack: errorInfo?.componentStack,
      },
    });
  }

  resetErrorBoundary = () => {
    this.setState({ 
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
