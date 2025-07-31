/**
 * Development Mode Error Display
 * Provides detailed error information with stack traces for development
 */

import { TodoLangComponent } from './component.js';
import { createElement } from './virtual-dom.js';
import { globalErrorReporter } from '../../debug/error-reporter.js';

/**
 * Development Error Display Component
 * Shows detailed error information in development mode
 */
export class DevErrorDisplay extends TodoLangComponent {
  constructor(props = {}) {
    super(props);

    this.state = {
      isExpanded: props.expanded || false,
      showStackTrace: props.showStackTrace !== false,
      shSourceMap: props.showSourceMap !== false,
      showContext: props.showContext !== false,
      showSuggestions: props.showSuggestions !== false
    };

    // Only show in development mode
    this.isDevelopment = props.isDevelopment ||
                       (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') ||
                       (typeof window !== 'undefined' && window.location.hostname === 'localhost');

    // Bind methods
    this.toggleExpanded = this.toggleExpanded.bind(this);
    this.copyErrorInfo = this.copyErrorInfo.bind(this);
    this.reportError = this.reportError.bind(this);
  }

  /**
   * Toggle expanded state
   */
  toggleExpanded() {
    this.setState({ isExpanded: !this.state.isExpanded });
  }

  /**
   * Copy error information to clipboard
   */
  async copyErrorInfo() {
    const { error, errorInfo } = this.props;

    const errorData = {
      message: error?.message || 'Unknown error',
      name: error?.name || 'Error',
      stack: error?.stack || 'No stack trace available',
      component: errorInfo?.component || 'Unknown component',
      timestamp: errorInfo?.timestamp || new Date().toISOString(),
      userAgent: navigator?.userAgent || 'Unknown',
      url: window?.location?.href || 'Unknown'
    };

    const errorText = `
TodoLang Error Report
====================
Error: ${errorData.name}: ${errorData.message}
Component: ${errorData.component}
Timestamp: ${errorData.timestamp}
URL: ${errorData.url}
User Agent: ${errorData.userAgent}

Stack Trace:
${errorData.stack}
    `.trim();

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(errorText);
        this._showCopySuccess();
      } else {
        // Fallback for older browsers
        this._fallbackCopyToClipboard(errorText);
      }
    } catch (error) {
      console.error('Failed to copy error info:', error);
    }
  }

  /**
   * Report error to error reporter
   */
  reportError() {
    const { error, errorInfo } = this.props;

    if (error) {
      globalErrorReporter.reportRuntimeError(error, {
        ...errorInfo,
        userReported: true,
        developmentMode: true
      });

      this._showReportSuccess();
    }
  }

  /**
   * Show copy success message
   */
  _showCopySuccess() {
    // Simple success indication - could be enhanced with toast notifications
    console.log('Error information copied to clipboard');
  }

  /**
   * Show report success message
   */
  _showReportSuccess() {
    console.log('Error reported successfully');
  }

  /**
   * Fallback clipboard copy for older browsers
   */
  _fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      this._showCopySuccess();
    } catch (error) {
      console.error('Fallback copy failed:', error);
    }

    document.body.removeChild(textArea);
  }

  /**
   * Parse stack trace into readable format
   */
  _parseStackTrace(stack) {
    if (!stack) return [];

    const lines = stack.split('\n');
    const frames = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('Error:')) continue;

      // Parse different stack trace formats
      let match = trimmed.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (!match) {
        match = trimmed.match(/at\s+(.+?):(\d+):(\d+)/);
        if (match) {
          frames.push({
            function: 'anonymous',
            file: match[1],
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            raw: trimmed
          });
        }
      } else {
        frames.push({
          function: match[1],
          file: match[2],
          line: parseInt(match[3]),
          column: parseInt(match[4]),
          raw: trimmed
        });
      }
    }

    return frames;
  }

  /**
   * Generate error suggestions based on error type
   */
  _generateSuggestions(error) {
    const suggestions = [];
    const message = error?.message?.toLowerCase() || '';
    const name = error?.name?.toLowerCase() || '';

    if (name.includes('reference') || message.includes('not defined')) {
      suggestions.push('Check if all variables and functions are properly declared');
      suggestions.push('Verify import statements and module dependencies');
    }

    if (name.includes('type') || message.includes('not a function')) {
      suggestions.push('Check the data types of your variables');
      suggestions.push('Ensure functions are called on the correct objects');
    }

    if (message.includes('null') || message.includes('undefined')) {
      suggestions.push('Add null/undefined checks before accessing properties');
      suggestions.push('Initialize variables with default values');
    }

    if (message.includes('quota') || message.includes('storage')) {
      suggestions.push('Clear browser storage or use incognito mode');
      suggestions.push('Reduce the amount of data being stored');
    }

    if (message.includes('network') || message.includes('fetch')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Verify API endpoints and CORS settings');
    }

    return suggestions;
  }

  /**
   * Render the development error display
   */
  render() {
    // Don't render in production mode
    if (!this.isDevelopment) {
      return createElement('div', { style: { display: 'none' } });
    }

    const { error, errorInfo, className = '', style = {} } = this.props;

    if (!error) {
      return createElement('div', { style: { display: 'none' } });
    }

    const stackFrames = this._parseStackTrace(error.stack);
    const suggestions = this._generateSuggestions(error);

    return createElement('div', {
      class: `dev-error-display ${className}`,
      style: {
        margin: '16px',
        padding: '16px',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        borderRadius: '8px',
        border: '2px solid #ff6b6b',
        fontFamily: 'monospace',
        fontSize: '14px',
        ...style
      }
    }, [
      // Header
      createElement('div', {
        class: 'error-header',
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          paddingBottom: '12px',
          borderBottom: '1px solid #333'
        }
      }, [
        createElement('div', { style: { display: 'flex', alignItems: 'center' } }, [
          createElement('span', {
            style: { fontSize: '18px', marginRight: '8px' }
          }, ['🐛']),
          createElement('h3', {
            style: { margin: '0', color: '#ff6b6b' }
          }, ['Development Error'])
        ]),
        createElement('div', { style: { display: 'flex', gap: '8px' } }, [
          createElement('button', {
            onclick: this.copyErrorInfo,
            style: {
              padding: '4px 8px',
              backgroundColor: '#4dabf7',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }
          }, ['Copy']),
          createElement('button', {
            onclick: this.reportError,
            style: {
              padding: '4px 8px',
              backgroundColor: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }
          }, ['Report']),
          createElement('button', {
            onclick: this.toggleExpanded,
            style: {
              padding: '4px 8px',
              backgroundColor: '#868e96',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }
          }, [this.state.isExpanded ? 'Collapse' : 'Expand'])
        ])
      ]),

      // Error summary
      createElement('div', { class: 'error-summary', style: { marginBottom: '16px' } }, [
        createElement('div', { style: { marginBottom: '8px' } }, [
          createElement('strong', { style: { color: '#ff6b6b' } }, [error.name || 'Error']),
          createElement('span', { style: { marginLeft: '8px' } }, [error.message || 'Unknown error'])
        ]),
        errorInfo?.component ? createElement('div', {
          style: { fontSize: '12px', color: '#adb5bd' }
        }, [
          `Component: ${errorInfo.component}`
        ]) : null,
        errorInfo?.timestamp ? createElement('div', {
          style: { fontSize: '12px', color: '#adb5bd' }
        }, [
          `Time: ${new Date(errorInfo.timestamp).toLocaleString()}`
        ]) : null
      ]),

      // Expanded details
      this.state.isExpanded ? createElement('div', { class: 'error-details' }, [
        // Stack trace
        this.state.showStackTrace && stackFrames.length > 0 ? createElement('div', {
          style: { marginBottom: '16px' }
        }, [
          createElement('h4', {
            style: { margin: '0 0 8px 0', color: '#ffd43b' }
          }, ['Stack Trace']),
          createElement('div', {
            style: {
              backgroundColor: '#000',
              padding: '12px',
              borderRadius: '4px',
              border: '1px solid #333',
              maxHeight: '200px',
              overflowY: 'auto'
            }
          }, stackFrames.map((frame, index) =>
            createElement('div', {
              key: `frame-${index}`,
              style: {
                marginBottom: '4px',
                fontSize: '12px',
                color: index === 0 ? '#ff6b6b' : '#adb5bd'
              }
            }, [
              createElement('div', {}, [
                `${frame.function} (${frame.file}:${frame.line}:${frame.column})`
              ])
            ])
          ))
        ]) : null,

        // Error context
        this.state.showContext && errorInfo ? createElement('div', {
          style: { marginBottom: '16px' }
        }, [
          createElement('h4', {
            style: { margin: '0 0 8px 0', color: '#ffd43b' }
          }, ['Context']),
          createElement('div', {
            style: {
              backgroundColor: '#000',
              padding: '12px',
              borderRadius: '4px',
              border: '1px solid #333'
            }
          }, [
            Object.entries(errorInfo).map(([key, value]) =>
              createElement('div', {
                key: key,
                style: { marginBottom: '4px', fontSize: '12px' }
              }, [
                createElement('span', { style: { color: '#51cf66' } }, [`${key}: `]),
                createElement('span', { style: { color: '#adb5bd' } }, [
                  typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
                ])
              ])
            )
          ])
        ]) : null,

        // Suggestions
        this.state.showSuggestions && suggestions.length > 0 ? createElement('div', {
          style: { marginBottom: '16px' }
        }, [
          createElement('h4', {
            style: { margin: '0 0 8px 0', color: '#ffd43b' }
          }, ['Suggestions']),
          createElement('ul', {
            style: {
              margin: '0',
              paddingLeft: '20px',
              color: '#adb5bd'
            }
          }, suggestions.map((suggestion, index) =>
            createElement('li', {
              key: `suggestion-${index}`,
              style: { marginBottom: '4px', fontSize: '12px' }
            }, [suggestion])
          ))
        ]) : null
      ]) : null
    ]);
  }
}

/**
 * Development Error Overlay
 * Full-screen error overlay for critical errors in development
 */
export class DevErrorOverlay extends TodoLangComponent {
  constructor(props = {}) {
    super(props);

    this.state = {
      isVisible: props.visible !== false
    };

    // Bind methods
    this.handleDismiss = this.handleDismiss.bind(this);
    this.handleReload = this.handleReload.bind(this);
  }

  /**
   * Handle overlay dismissal
   */
  handleDismiss() {
    this.setState({ isVisible: false });

    if (this.props.onDismiss) {
      this.props.onDismiss();
    }
  }

  /**
   * Handle page reload
   */
  handleReload() {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  /**
   * Render error overlay
   */
  render() {
    if (!this.state.isVisible) {
      return createElement('div', { style: { display: 'none' } });
    }

    const { error, errorInfo } = this.props;

    return createElement('div', {
      class: 'dev-error-overlay',
      style: {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: '9999',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }
    }, [
      createElement('div', {
        style: {
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          borderRadius: '12px',
          border: '2px solid #ff6b6b',
          padding: '24px',
          maxWidth: '800px',
          maxHeight: '80vh',
          overflowY: 'auto',
          width: '100%'
        }
      }, [
        // Header
        createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid #333'
          }
        }, [
          createElement('h2', {
            style: { margin: '0', color: '#ff6b6b', fontSize: '24px' }
          }, ['🚨 Critical Error']),
          createElement('button', {
            onclick: this.handleDismiss,
            style: {
              backgroundColor: 'transparent',
              border: 'none',
              color: '#adb5bd',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              width: '32px',
              height: '32px'
            }
          }, ['×'])
        ]),

        // Error content
        createElement(DevErrorDisplay, {
          error: error,
          errorInfo: errorInfo,
          expanded: true,
          isDevelopment: true,
          style: { margin: '0', border: 'none' }
        }),

        // Actions
        createElement('div', {
          style: {
            display: 'flex',
            gap: '12px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #333'
          }
        }, [
          createElement('button', {
            onclick: this.handleReload,
            style: {
              padding: '12px 24px',
              backgroundColor: '#4dabf7',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }
          }, ['Reload Page']),
          createElement('button', {
            onclick: this.handleDismiss,
            style: {
              padding: '12px 24px',
              backgroundColor: '#868e96',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }
          }, ['Dismiss'])
        ])
      ])
    ]);
  }
}

/**
 * Development error handler utility
 */
export class DevErrorHandler {
  constructor() {
    this.overlayContainer = null;
    this.currentOverlay = null;
    this.isDevelopment = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
  }

  /**
   * Show error overlay
   */
  showErrorOverlay(error, errorInfo = {}) {
    if (!this.isDevelopment) return;

    // Create overlay container if it doesn't exist
    if (!this.overlayContainer && typeof document !== 'undefined') {
      this.overlayContainer = document.createElement('div');
      this.overlayContainer.id = 'dev-error-overlay-container';
      document.body.appendChild(this.overlayContainer);
    }

    // Create and mount overlay component
    if (this.overlayContainer) {
      this.currentOverlay = new DevErrorOverlay({
        error: error,
        errorInfo: errorInfo,
        onDismiss: () => this.hideErrorOverlay()
      });

      this.currentOverlay.mount(this.overlayContainer);
    }
  }

  /**
   * Hide error overlay
   */
  hideErrorOverlay() {
    if (this.currentOverlay) {
      this.currentOverlay.unmount();
      this.currentOverlay = null;
    }
  }

  /**
   * Handle unhandled errors in development
   */
  handleUnhandledError(error, source = 'unknown') {
    if (!this.isDevelopment) return;

    const errorInfo = {
      source: source,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      url: typeof window !== 'undefined' ? window.location.href : null
    };

    this.showErrorOverlay(error, errorInfo);
  }
}

// Create global development error handler
export const devErrorHandler = new DevErrorHandler();

// Auto-initialize in development mode
if (typeof window !== 'undefined' && devErrorHandler.isDevelopment) {
  window.addEventListener('error', (event) => {
    devErrorHandler.handleUnhandledError(event.error, 'global');
  });

  window.addEventListener('unhandledrejection', (event) => {
    devErrorHandler.handleUnhandledError(event.reason, 'unhandledrejection');
  });
}