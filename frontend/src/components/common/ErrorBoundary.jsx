import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-red-600 font-semibold">Something went wrong.</p>
          <p className="text-sm text-slate-500 mt-1">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 btn-secondary text-sm"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
