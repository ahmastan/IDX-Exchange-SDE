import { Component } from "react";
import { Link } from "react-router-dom";
import "./ErrorBoundary.css";

// Catches errors thrown while rendering anything inside it and shows a
// recovery screen instead of a blank page. Error boundaries must be class
// components: getDerivedStateFromError has no hook equivalent.
//
// It does NOT catch errors in event handlers, in async code like fetch
// callbacks, or in itself. Those don't happen during rendering, so the pages
// handle them with their own error state.
//
// resetKey: when it changes (App passes the URL path), a showing error is
// cleared, so navigating to another page recovers without a full reload.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // React already logs the error in development. This hook is where an
    // error-reporting service would be called in production.
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="error-boundary" role="alert">
        <h1>Something went wrong</h1>
        <p>This page ran into an unexpected problem. Trying again usually fixes it.</p>
        <div className="error-boundary__actions">
          <button type="button" onClick={this.reset}>
            Try again
          </button>
          <Link to="/" onClick={this.reset}>
            Back to listings
          </Link>
        </div>
      </main>
    );
  }
}
