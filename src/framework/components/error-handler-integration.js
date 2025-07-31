/**
 * Error Handler Integration
 * Integrates all error handling components into a cohesive system
 */

import { ErrorBoundary, globalErrorHandler } from './error-boundary.js';
import { ValidationError, ValidatedInput, FormValidator } from './validation-error.js';
import { DevErrorDisplay, DevErrorOverlay, devErrorHandler } from './dev-error-display.js';
import { StorageService } from '../storage/index.js';
import { globalErrorReporter } from '../../debug/error-reporter.js';

/**
 * Comprehensive Error Handler
 * Manages all types of errors in the application
 */
export class ComprehensiveErrorHandler {
  constructor(options = {}) {
    this.options = {
      enableErrorBoundaries: options.enableErrorBoundaries !== false,
      enableValidation: options.enableValidation !== false,
      enableStorageErrorHandling: options.enableStorageErrorHandling !== false,
      enableDevMode: options.enableDevMode !== false,
      enableReporting: options.enableReporting !== false,
      maxRetries: options.maxRetries || 3,
      userErrorCallback: options.onUserError || null,
      ...options
    };

    // Error statistics
    this.errorStats = {
      runtime: 0,
      validation: 0,
      storage: 0,
      boundary: 0,
      total: 0
    };

    // Error history
    this.errorHistory = [];
    this.maxErrorHistory = 100;

    // Component instances
    this.errorBoundaries = new Set();
    this.validatedInputs = new Set();
    this.formValidators = new Set();

    // Initialize subsystems
    this._initializeErrorHandling();
  }

  /**
   * Initialize error handling subsystems
   */
  _initializeErrorHandling() {
    // Initialize global error handler
    if (this.options.enableErrorBoundaries) {
      globalErrorHandler.initialize();
    }

    // Initialize development error handler
    if (this.options.enableDevMode) {
      devErrorHandler.isDevelopment = true;
    }

    // Set up global error listeners
    this._setupGlobalErrorListeners();
  }

  /**
   * Set up global error listeners
   */
  _setupGlobalErrorListeners() {
    if (typeof window === 'undefined') return;

    // Handle unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error, 'javascript', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(event.reason, 'promise', {
        promise: event.promise
      });
    });

    // Handle resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleResourceError(event.target, event);
      }
    }, true);
  }

  /**
   * Handle global errors
   */
  handleGlobalError(error, source, context = {}) {
    const errorInfo = {
      source: source,
      context: context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Update statistics
    this.errorStats.runtime++;
    this.errorStats.total++;

    // Add to history
    this._addToErrorHistory({
      type: 'runtime',
      error: error,
      info: errorInfo
    });

    // Report error
    if (this.options.enableReporting) {
      globalErrorReporter.reportRuntimeError(error, errorInfo);
    }

    // Show development overlay if enabled
    if (this.options.enableDevMode) {
      devErrorHandler.handleUnhandledError(error, source);
    }

    // Notify user error callback
    if (this.options.userErrorCallback) {
      try {
        this.options.userErrorCallback(error, 'global', errorInfo);
      } catch (callbackError) {
        console.error('Error in user error callback:', callbackError);
      }
    }

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
   * Handle resource loading errors
   */
  handleResourceError(element, event) {
    const error = new Error(`Failed to load resource: ${element.src || element.href}`);
    const errorInfo = {
      type: 'resource',
      element: element.tagName,
      src: element.src || element.href,
      timestamp: new Date().toISOString()
    };

    this._addToErrorHistory({
      type: 'resource',
      error: error,
      info: errorInfo
    });

    if (this.options.enableReporting) {
      globalErrorReporter.reportRuntimeError(error, errorInfo);
    }
  }

  /**
   * Create error boundary with integrated handling
   */
  createErrorBoundary(options = {}) {
    const boundary = new ErrorBoundary({
      maxRetries: this.options.maxRetries,
      enableReporting: this.options.enableReporting,
      onError: (error, errorInfo, boundary) => {
        this.handleBoundaryError(error, errorInfo, boundary);
      },
      ...options
    });

    this.errorBoundaries.add(boundary);
    globalErrorHandler.registerErrorBoundary(boundary);

    return boundary;
  }

  /**
   * Handle error boundary errors
   */
  handleBoundaryError(error, errorInfo, boundary) {
    // Update statistics
    this.errorStats.boundary++;
    this.errorStats.total++;

    // Add to history
    this._addToErrorHistory({
      type: 'boundary',
      error: error,
      info: errorInfo,
      boundary: boundary.displayName
    });

    // Call user error callback
    if (this.options.userErrorCallback) {
      try {
        this.options.userErrorCallback(error, 'boundary', errorInfo);
      } catch (callbackError) {
        console.error('Error in user error callback:', callbackError);
      }
    }
  }

  /**
   * Create validated input with integrated error handling
   */
  createValidatedInput(options = {}) {
    const input = new ValidatedInput({
      onValidation: (isValid, errors, value) => {
        if (!isValid) {
          this.handleValidationError(errors, options.name || 'unknown', value);
        }
      },
      ...options
    });

    this.validatedInputs.add(input);
    return input;
  }

  /**
   * Handle validation errors
   */
  handleValidationError(errors, fieldName, value) {
    // Update statistics
    this.errorStats.validation += errors.length;
    this.errorStats.total += errors.length;

    // Add to history
    for (const error of errors) {
      this._addToErrorHistory({
        type: 'validation',
        error: error,
        field: fieldName,
        value: value
      });
    }

    // Report validation errors if enabled
    if (this.options.enableReporting) {
      for (const error of errors) {
        globalErrorReporter.reportWarning(`Validation error in ${fieldName}: ${error.message}`, {
          field: fieldName,
          value: value,
          error: error
        });
      }
    }
  }

  /**
   * Create form validator with integrated error handling
   */
  createFormValidator(options = {}) {
    const validator = new FormValidator();

    // Override validateField to integrate with error handling
    const originalValidateField = validator.validateField.bind(validator);
    validator.validateField = async (name, value) => {
      const result = await originalValidateField(name, value);

      if (!result) {
        const errors = validator.getFieldErrors(name);
        this.handleValidationError(errors, name, value);
      }

      return result;
    };

    this.formValidators.add(validator);
    return validator;
  }

  /**
   * Create storage service with integrated error handling
   */
  createStorageService(options = {}) {
    return new StorageService({
      enableErrorReporting: this.options.enableReporting,
      onUserError: (error, operation) => {
        this.handleStorageError(error, operation);
      },
      ...options
    });
  }

  /**
   * Handle storage errors
   */
  handleStorageError(error, operation) {
    // Update statistics
    this.errorStats.storage++;
    this.errorStats.total++;

    // Add to history
    this._addToErrorHistory({
      type: 'storage',
      error: error,
      operation: operation
    });

    // Call user error callback
    if (this.options.userErrorCallback) {
      try {
        this.options.userErrorCallback(error, 'storage', { operation });
      } catch (callbackError) {
        console.error('Error in user error callback:', callbackError);
      }
    }
  }

  /**
   * Create validation error display component
   */
  createValidationErrorDisplay(options = {}) {
    return new ValidationError({
      dismissible: true,
      autoHide: false,
      ...options
    });
  }

  /**
   * Create development error display
   */
  createDevErrorDisplay(options = {}) {
    if (!this.options.enableDevMode) {
      return null;
    }

    return new DevErrorDisplay({
      isDevelopment: true,
      showStackTrace: true,
      showSourceMap: true,
      showContext: true,
      showSuggestions: true,
      ...options
    });
  }

  /**
   * Show error notification to user
   */
  showUserError(message, type = 'error', options = {}) {
    const errorInfo = {
      message: message,
      type: type,
      timestamp: new Date().toISOString(),
      ...options
    };

    // Add to history
    this._addToErrorHistory({
      type: 'user-notification',
      error: { message: message },
      info: errorInfo
    });

    // Call user error callback
    if (this.options.userErrorCallback) {
      try {
        this.options.userErrorCallback({ message }, 'user-notification', errorInfo);
      } catch (callbackError) {
        console.error('Error in user error callback:', callbackError);
      }
    }

    // Simple console notification (could be enhanced with toast notifications)
    console.warn(`User Error [${type}]: ${message}`);
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    return {
      ...this.errorStats,
      errorBoundaries: this.errorBoundaries.size,
      validatedInputs: this.validatedInputs.size,
      formValidators: this.formValidators.size,
      historySize: this.errorHistory.length
    };
  }

  /**
   * Get error history
   */
  getErrorHistory(limit = 50) {
    return this.errorHistory.slice(-limit);
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory = [];
  }

  /**
   * Reset error statistics
   */
  resetErrorStats() {
    this.errorStats = {
      runtime: 0,
      validation: 0,
      storage: 0,
      boundary: 0,
      total: 0
    };
  }

  /**
   * Generate error report
   */
  generateErrorReport() {
    return {
      timestamp: new Date().toISOString(),
      statistics: this.getErrorStats(),
      recentErrors: this.getErrorHistory(20),
      configuration: {
        enableErrorBoundaries: this.options.enableErrorBoundaries,
        enableValidation: this.options.enableValidation,
        enableStorageErrorHandling: this.options.enableStorageErrorHandling,
        enableDevMode: this.options.enableDevMode,
        enableReporting: this.options.enableReporting,
        maxRetries: this.options.maxRetries
      },
      environment: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        url: typeof window !== 'undefined' ? window.location.href : null,
        timestamp: Date.now()
      }
    };
  }

  /**
   * Test error handling system
   */
  async testErrorHandling() {
    const results = {
      errorBoundary: false,
      validation: false,
      storage: false,
      devMode: false,
      reporting: false,
      errors: []
    };

    try {
      // Test error boundary
      const boundary = this.createErrorBoundary();
      const testError = new Error('Test error');
      boundary.onError(testError, 'test');
      results.errorBoundary = boundary.state.hasError;
    } catch (error) {
      results.errors.push({ component: 'errorBoundary', error: error.message });
    }

    try {
      // Test validation
      const input = this.createValidatedInput({
        validators: [{ validate: (value) => value ? true : 'Required' }]
      });
      await input.validate('');
      results.validation = !input.state.isValid;
    } catch (error) {
      results.errors.push({ component: 'validation', error: error.message });
    }

    try {
      // Test storage
      const storage = this.createStorageService();
      const testResults = await storage.testStorage();
      results.storage = testResults.canWrite && testResults.canRead;
    } catch (error) {
      results.errors.push({ component: 'storage', error: error.message });
    }

    try {
      // Test dev mode
      if (this.options.enableDevMode) {
        const devDisplay = this.createDevErrorDisplay({
          error: new Error('Test dev error')
        });
        results.devMode = devDisplay !== null;
      } else {
        results.devMode = true; // Not enabled, so test passes
      }
    } catch (error) {
      results.errors.push({ component: 'devMode', error: error.message });
    }

    try {
      // Test reporting
      if (this.options.enableReporting) {
        globalErrorReporter.debug('Test error handling system');
        results.reporting = true;
      } else {
        results.reporting = true; // Not enabled, so test passes
      }
    } catch (error) {
      results.errors.push({ component: 'reporting', error: error.message });
    }

    return results;
  }

  /**
   * Cleanup error handler
   */
  cleanup() {
    // Unregister error boundaries
    for (const boundary of this.errorBoundaries) {
      globalErrorHandler.unregisterErrorBoundary(boundary);
      boundary.unmount();
    }

    // Clear collections
    this.errorBoundaries.clear();
    this.validatedInputs.clear();
    this.formValidators.clear();

    // Clear history
    this.clearErrorHistory();
    this.resetErrorStats();
  }

  /**
   * Add error to history
   */
  _addToErrorHistory(errorEntry) {
    this.errorHistory.push({
      ...errorEntry,
      timestamp: new Date().toISOString(),
      id: this._generateErrorId()
    });

    // Keep history within limits
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(-this.maxErrorHistory);
    }
  }

  /**
   * Generate unique error ID
   */
  _generateErrorId() {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Global error handler instance
 */
export const globalComprehensiveErrorHandler = new ComprehensiveErrorHandler({
  enableErrorBoundaries: true,
  enableValidation: true,
  enableStorageErrorHandling: true,
  enableDevMode: typeof process !== 'undefined' && process.env.NODE_ENV === 'development',
  enableReporting: true
});

/**
 * Convenience functions for creating error handling components
 */
export function createErrorBoundary(options = {}) {
  return globalComprehensiveErrorHandler.createErrorBoundary(options);
}

export function createValidatedInput(options = {}) {
  return globalComprehensiveErrorHandler.createValidatedInput(options);
}

export function createFormValidator(options = {}) {
  return globalComprehensiveErrorHandler.createFormValidator(options);
}

export function createStorageService(options = {}) {
  return globalComprehensiveErrorHandler.createStorageService(options);
}

export function showUserError(message, type = 'error', options = {}) {
  return globalComprehensiveErrorHandler.showUserError(message, type, options);
}

export function getErrorStats() {
  return globalComprehensiveErrorHandler.getErrorStats();
}

export function generateErrorReport() {
  return globalComprehensiveErrorHandler.generateErrorReport();
}