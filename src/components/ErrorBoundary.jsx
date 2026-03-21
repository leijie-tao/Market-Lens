import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

// Error Boundary must be a class component — React's componentDidCatch
// lifecycle is not available in function components.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    // Called when a child throws — update state so next render shows the fallback UI
    return { hasError: true, message: error?.message || "Unknown error" };
  }

  componentDidCatch(error, info) {
    // Good place to log to an error reporting service in the future
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset() {
    this.setState({ hasError: false, message: "" });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-900/50 bg-red-950/20 px-6 py-8 flex flex-col items-center gap-3 text-center">
          <AlertTriangle size={24} className="text-red-400" />
          <p className="text-red-300 text-sm font-semibold">Something went wrong in this section.</p>
          <p className="text-gray-500 text-xs max-w-sm">{this.state.message}</p>
          <button
            onClick={() => this.handleReset()}
            className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors"
          >
            <RefreshCw size={12} />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
