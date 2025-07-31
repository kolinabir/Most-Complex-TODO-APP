/**
 * Error Boundary Component
 * Provides graceful error recovery and user-friendly error display
 */

import { TodoLangComponent } from './component.js';
import { createElement } from './virtual-dom.js';
import { globalErrorReporter } from '../../debug/error-reporter.js';

/**
 * Error Boundary Component
 * Catches errors in child components and displays fallback UI
 */
export class ErrorBoundary extends TodoLangComponent {
  constructor(props = {}) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfonull,
      errorId: null,
      retryCount: 0,
      isRecovering: false
    };

    // Configuration options
    this.options = {
      maxRetries: props.maxRetries || 3,
      enableRetry: props.enableRetry !== false,
      enableReporting: props.enableReporting !== false,
      fallbackComponent: props.fallbackComponent || null,
      onError: props.onError || null,
      onRecover: props.onRecover || null,
      showErrorDetails: props.showErrorDetails || (process.env.NODE_ENV === 'development'),
      autoRetryDelay: props.autoRetryDelay || 5000
    };

    // Bind methods
    this.handleRetry = this.handleRetry.bind(this);
    this.handleDismiss = this.handleDismiss.bind(this);
    this.handleReportError = this.handleReportError.bind(this);
  }

  /**
   * Catch errors from child components
   */
  onError(error, phase) {
    const errorInfo = {
      componentStack: this._getComponentStack(),
      errorBoundary: this.displayName,
      phase: phase,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      url: typeof window !== 'undefined' ? window.location.href : null
    };

    const errorId = this._generateErrorId();

    // Update state to show error UI
    this.setState({
      hasError: true,
      error: error,
      errorInfo: errorInfo,
      errorId: errorId,
      isRecovering: false
    });

    // Report error if enabled
    if (this.options.enableReporting) {
      globalErrorReporter.reportRuntimeError(error, {
        component: this.displayName,
        errorBoundary: true,
        errorInfo: errorInfo,
        props: this.props,
        state: this.state
      });
    }

    // Call custom error handler if provided
    if (this.options.onError) {
      try {
        this.options.onError(error, errorInfo, this);
      } catch (handlerError) {
        console.error('Error in custom error handler:', handlerError);
      }
    }

    // Auto-retry if enabled and within retry limit
    if (this.options.enableRetry && this.state.retryCount < this.options.maxRetries) {
      setTimeout(() => {
        this.handleRetry();
      }, this.options.autoRetryDelay);
    }
  }

  /**
   * Handle retry attempt
   */
  handleRetry() {
    if (this.state.retryCount >= this.options.maxRetries) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    this.setState({
      isRecovering: true,
      retryCount: this.state.retryCount + 1
    });

    // Attempt to recover by resetting error state
    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        isRecovering: false
      });

      // Call recovery callback if provided
      if (this.options.onRecover) {
        try {
          this.options.onRecover(this.state.retryCount, this);
        } catch (recoveryError) {
          console.error('Error in recovery callback:', recoveryError);
        }
      }
    }, 1000);
  }

  /**
   * Handle error dismissal
   */
  handleDismiss() {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false
    });
  }

  /**
   * Handle manual error reporting
   */
  handleReportError() {
    if (!this.state.error) return;

    const reportData = {
      error: this.state.error,
      errorInfo: this.state.errorInfo,
      component: this.displayName,
      props: this.props,
      state: this.state,
      userFeedback: 'User manually reported error'
    };

    globalErrorReporter.reportRuntimeError(this.state.error, reportData);

    // Show confirmation
    if (typeof window !== 'undefined' && window.alert) {
      window.alert('Error report sent. Thank you for helping us improve the application.');
    }
  }

  /**
   * Reset error boundary state
   */
  resetErrorBoundary() {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false
    });
  }

  /**
   * Render error UI or children
   */
  render() {
    if (this.state.hasError) {
      return this._renderErrorUI();
    }

    // Render children normally
    return this.props.children || createElement('div', {}, []);
  }

  /**
   * Render error UI
   */
  _renderErrorUI() {
    // Use custom fallback component if provided
    if (this.options.fallbackComponent) {
      return createElement(this.options.fallbackComponent, {
        error: this.state.error,
        errorInfo: this.state.errorInfo,
        onRetry: this.handleRetry,
        onDismiss: this.handleDismiss,
        canRetry: this.state.retryCount < this.options.maxRetries
      });
    }

    // Default error UI
    return createElement('div', {
      class: 'error-boundary',
      style: {
        padding: '20px',
        margin: '10px',
        border: '2px solid #ff6b6b',
        borderRadius: '8px',
        backgroundColor: '#fff5f5',
        color: '#c92a2a'
      }
    }, [
      createElement('div', { class: 'error-boundary-header' }, [
        createElement('h3', { style: { margin: '0 0 10px 0', color: '#c92a2a' } }, [
          '⚠️ Something went wrong'
        ]),
        createElement('p', { style: { margin: '0 0 15px 0' } }, [
          'An error occurred while rendering this component. The application is still functional, but this section may not display correctly.'
        ])
      ]),

      // Error details (development mode only)
      this.options.showErrorDetails ? createElement('div', { class: 'error-details' }, [
        createElement('details', { style: { marginBottom: '15px' } }, [
          createElement('summary', { style: { cursor: 'pointer', fontWeight: 'bold' } }, [
            'Error Details'
          ]),
          createElement('div', { style: { marginTop: '10px', padding: '10px', backgroundColor: '#f8f8f8', borderRadius: '4px' } }, [
            createElement('p', { style: { margin: '0 0 10px 0', fontFamily: 'monospace', fontSize: '12px' } }, [
              `Error: ${this.state.error?.message || 'Unknown error'}`
            ]),
            createElement('p', { style: { margin: '0 0 10px 0', fontFamily: 'monospace', fontSize: '12px' } }, [
              `Component: ${this.state.errorInfo?.componentStack || 'Unknown'}`
            ]),
            createElement('p', { style: { margin: '0', fontFamily: 'monospace', fontSize: '12px' } }, [
              `Error ID: ${this.state.errorId}`
            ])
          ])
        ])
      ]) : null,

      // Action buttons
      createElement('div', { class: 'error-actions', style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } }, [
        // Retry button
        this.options.enableRetry && this.state.retryCount < this.options.maxRetries ?
          createElement('button', {
            onclick: this.handleRetry,
            disabled: this.state.isRecovering,
            style: {
              padding: '8px 16px',
              backgroundColor: '#4dabf7',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: this.state.isRecovering ? 'not-allowed' : 'pointer',
              opacity: this.state.isRecovering ? '0.6' : '1'
            }
          }, [
            this.state.isRecovering ? 'Retrying...' : `Retry (${this.options.maxRetries - this.state.retryCount} left)`
          ]) : null,

        // Dismiss button
        createElement('button', {
          onclick: this.handleDismiss,
          style: {
            padding: '8px 16px',
            backgroundColor: '#868e96',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }, ['Dismiss']),

        // Report error button (development mode)
        this.options.showErrorDetails ? createElement('button', {
          onclick: this.handleReportError,
          style: {
            padding: '8px 16px',
            backgroundColor: '#ff6b6b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }
        }, ['Report Error']) : null
      ])
    ]);
  }

  /**
   * Get component stack trace
   */
  _getComponentStack() {
    const stack = [];
    let current = this;

    while (current) {
      stack.push(current.displayName || current.constructor.name);
      current = current._parent;
    }

    return stack.join(' -> ');
  }

  /**
   * Generate unique error ID
   */
  _generateErrorId() {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  return class extends TodoLangComponent {
    render() {
      return createElement(ErrorBoundary, errorBoundaryProps, [
        createElement(Component, this.props)
      ]);
    }
  };
}

/**
 * Hook-like function to create error boundary
 */
export function createErrorBoundary(options = {}) {
  return new ErrorBoundary(options);
}

/**
 * Global error handler for unhandled errors
 */
export class GlobalErrorHandler {
  constructor() {
    this.errorBoundaries = new Set();
    this.isInitialized = false;
  }

  /**
   * Initialize global error handling
   */
  initialize() {
    if (this.isInitialized) return;

    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleUnhandledError(event.reason, 'unhandledrejection');
      });

      // Handle global JavaScript errors
      window.addEventListener('error', (event) => {
        this.handleUnhandledError(event.error, 'global');
      });
    }

    this.isInitialized = true;
  }

  /**
   * Register error boundary
   */
  registerErrorBoundary(errorBoundary) {
    this.errorBoundaries.add(errorBoundary);
  }

  /**
   * Unregister error boundary
   */
  unregisterErrorBoundary(errorBoundary) {
    this.errorBoundaries.delete(errorBoundary);
  }

  /**
   * Handle unhandled errors
   */
  handleUnhandledError(error, source) {
    console.error(`Unhandled error from ${source}:`, error);

    // Report to error reporter
    globalErrorReporter.reportRuntimeError(error, {
      source: source,
      global: true,
      timestamp: new Date().toISOString()
    });

    // Notify error boundaries
    for (const boundary of this.errorBoundaries) {
      try {
        boundary.onError(error, `global-${source}`);
      } catch (boundaryError) {
        console.error('Error in error boundary:', boundaryError);
      }
    }
  }

  /**
   * Get error statistics
   */
  getStats() {
    return {
      registeredBoundaries: this.errorBoundaries.size,
      isInitialized: this.isInitialized
    };
  }
}

// Create global error handler instance
export const globalErrorHandler = new GlobalErrorHandler();

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  globalErrorHandler.initialize();
}