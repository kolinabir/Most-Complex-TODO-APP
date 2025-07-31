/**
 * Error Handling System Tests
 * Comprehensive tests for error boundaries, validation, storage errors, and recovery
 */

// Mock dependencies
const mockGlobalErrorReporter = {
  reportRuntimeError: jest.fn(),
  reportCompilationError: jest.fn(),
  reportWarning: jest.fn(),
  debug: jest.fn()
};

// Mock modules
jest.mock('../../src/debug/error-reporter.js', () => ({
  globalErrorReporter: mockGlobalErrorReporter,
  reportRuntimeError: mockGlobalErrorReporter.reportRuntimeError,
  reportCompilationError: mockGlobalErrorReporter.reportCompilationError,
  reportWarning: mockGlobalErrorReporter.reportWarning,
  debug: mockGlobalErrorReporter.debug
}));

// Import components after mocking
import { ErrorBoundary, withErrorBoundary, GlobalErrorHandler } from '../../src/framework/components/error-boundary.js';
import { ValidationError, ValidatedInput, validators, FormValidator } from '../../src/framework/components/validation-error.js';
import { StorageService, StorageError } from '../../src/framework/storage/index.js';
import { DevErrorDisplay, DevErrorOverlay, devErrorHandler } from '../../src/framework/components/dev-error-display.js';

// Mock DOM environment
const mockDocument = {
  createElement: jest.fn(() => ({
    style: {},
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    focus: jest.fn(),
    select: jest.fn()
  })),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  },
  execCommand: jest.fn(() => true)
};

const mockWindow = {
  location: {
    href: 'http://localhost:3000/test',
    hostname: 'localhost',
    reload: jest.fn()
  },
  navigator: {
    userAgent: 'Test Browser 1.0',
    clipboard: {
      writeText: jest.fn(() => Promise.resolve())
    }
  },
  addEventListener: jest.fn(),
  alert: jest.fn()
};

global.document = mockDocument;
global.window = mockWindow;
global.navigator = mockWindow.navigator;

describe('Error Handling System', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock implementations
    mockGlobalErrorReporter.reportRuntimeError.mockClear();
    mockGlobalErrorReporter.reportCompilationError.mockClear();
    mockGlobalErrorReporter.reportWarning.mockClear();
    mockGlobalErrorReporter.debug.mockClear();
  });

  describe('ErrorBoundary Component', () => {
    let errorBoundary;

eEach(() => {
      errorBoundary = new ErrorBoundary({
        maxRetries: 3,
        enableRetry: true,
        enableReporting: true
      });
    });

    afterEach(() => {
      if (errorBoundary) {
        errorBoundary.unmount();
      }
    });

    test('should initialize with default state', () => {
      expect(errorBoundary.state.hasError).toBe(false);
      expect(errorBoundary.state.error).toBeNull();
      expect(errorBoundary.state.retryCount).toBe(0);
      expect(errorBoundary.options.maxRetries).toBe(3);
    });

    test('should catch and handle errors', () => {
      const testError = new Error('Test error');
      const phase = 'render';

      errorBoundary.onError(testError, phase);

      expect(errorBoundary.state.hasError).toBe(true);
      expect(errorBoundary.state.error).toBe(testError);
      expect(errorBoundary.state.errorInfo.phase).toBe(phase);
      expect(mockGlobalErrorReporter.reportRuntimeError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          component: errorBoundary.displayName,
          errorBoundary: true
        })
      );
    });

    test('should handle retry attempts', () => {
      const testError = new Error('Test error');
      errorBoundary.onError(testError, 'render');

      expect(errorBoundary.state.retryCount).toBe(0);

      errorBoundary.handleRetry();

      expect(errorBoundary.state.retryCount).toBe(1);
      expect(errorBoundary.state.isRecovering).toBe(true);
    });

    test('should respect maximum retry limit', () => {
      const testError = new Error('Test error');

      // Exceed retry limit
      errorBoundary.setState({ retryCount: 3 });
      errorBoundary.handleRetry();

      expect(errorBoundary.state.retryCount).toBe(3); // Should not increment
    });

    test('should reset error boundary state', () => {
      const testError = new Error('Test error');
      errorBoundary.onError(testError, 'render');

      errorBoundary.resetErrorBoundary();

      expect(errorBoundary.state.hasError).toBe(false);
      expect(errorBoundary.state.error).toBeNull();
      expect(errorBoundary.state.retryCount).toBe(0);
    });

    test('should call custom error handler', () => {
      const customErrorHandler = jest.fn();
      const boundaryWithHandler = new ErrorBoundary({
        onError: customErrorHandler
      });

      const testError = new Error('Test error');
      boundaryWithHandler.onError(testError, 'render');

      expect(customErrorHandler).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({ phase: 'render' }),
        boundaryWithHandler
      );
    });

    test('should generate unique error IDs', () => {
      const testError = new Error('Test error');

      errorBoundary.onError(testError, 'render');
      const firstErrorId = errorBoundary.state.errorId;

      errorBoundary.resetErrorBoundary();
      errorBoundary.onError(testError, 'render');
      const secondErrorId = errorBoundary.state.errorId;

      expect(firstErrorId).not.toBe(secondErrorId);
      expect(firstErrorId).toMatch(/^error-\d+-[a-z0-9]+$/);
    });
  });

  describe('withErrorBoundary HOC', () => {
    test('should wrap component with error boundary', () => {
      class TestComponent {
        render() {
          return { type: 'div', props: {}, children: ['Test'] };
        }
      }

      const WrappedComponent = withErrorBoundary(TestComponent, {
        maxRetries: 2
      });

      const instance = new WrappedComponent();
      const rendered = instance.render();

      expect(rendered.type).toBe(ErrorBoundary);
      expect(rendered.props.maxRetries).toBe(2);
    });
  });

  describe('GlobalErrorHandler', () => {
    let globalHandler;

    beforeEach(() => {
      globalHandler = new GlobalErrorHandler();
    });

    test('should initialize correctly', () => {
      expect(globalHandler.isInitialized).toBe(false);
      expect(globalHandler.errorBoundaries.size).toBe(0);

      globalHandler.initialize();

      expect(globalHandler.isInitialized).toBe(true);
    });

    test('should register and unregister error boundaries', () => {
      const boundary = new ErrorBoundary();

      globalHandler.registerErrorBoundary(boundary);
      expect(globalHandler.errorBoundaries.size).toBe(1);

      globalHandler.unregisterErrorBoundary(boundary);
      expect(globalHandler.errorBoundaries.size).toBe(0);
    });

    test('should handle unhandled errors', () => {
      const boundary = new ErrorBoundary();
      boundary.onError = jest.fn();

      globalHandler.registerErrorBoundary(boundary);

      const testError = new Error('Unhandled error');
      globalHandler.handleUnhandledError(testError, 'global');

      expect(mockGlobalErrorReporter.reportRuntimeError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          source: 'global',
          global: true
        })
      );
      expect(boundary.onError).toHaveBeenCalledWith(testError, 'global-global');
    });
  });

  describe('ValidationError Component', () => {
    let validationError;

    beforeEach(() => {
      validationError = new ValidationError({
        errors: [
          'This field is required',
          { message: 'Invalid format', type: 'pattern', field: 'email' }
        ],
        dismissible: true
      });
    });

    test('should initialize with errors', () => {
      expect(validationError.state.isVisible).toBe(true);
      expect(validationError.state.isDismissible).toBe(true);
    });

    test('should handle dismissal', () => {
      const onDismiss = jest.fn();
      validationError.props.onDismiss = onDismiss;

      validationError.handleDismiss();

      expect(validationError.state.isVisible).toBe(false);
      expect(onDismiss).toHaveBeenCalled();
    });

    test('should not render when no errors', () => {
      const noErrorComponent = new ValidationError({ errors: [] });
      const rendered = noErrorComponent.render();

      expect(rendered.props.style.display).toBe('none');
    });

    test('should not render when not visible', () => {
      validationError.setState({ isVisible: false });
      const rendered = validationError.render();

      expect(rendered.props.style.display).toBe('none');
    });
  });

  describe('ValidatedInput Component', () => {
    let validatedInput;

    beforeEach(() => {
      validatedInput = new ValidatedInput({
        name: 'testField',
        validators: [
          validators.required(),
          validators.minLength(3)
        ],
        validateOnChange: true
      });
    });

    test('should initialize with default state', () => {
      expect(validatedInput.state.value).toBe('');
      expect(validatedInput.state.errors).toEqual([]);
      expect(validatedInput.state.isValid).toBe(true);
      expect(validatedInput.state.isTouched).toBe(false);
    });

    test('should handle input changes', () => {
      const mockEvent = { target: { value: 'test' } };
      const onChange = jest.fn();
      validatedInput.props.onChange = onChange;

      validatedInput.handleChange(mockEvent);

      expect(validatedInput.state.value).toBe('test');
      expect(validatedInput.state.isTouched).toBe(true);
      expect(onChange).toHaveBeenCalledWith(mockEvent, 'test', expect.any(Boolean));
    });

    test('should validate on change when enabled', async () => {
      const mockEvent = { target: { value: 'ab' } }; // Too short

      validatedInput.handleChange(mockEvent);
      await validatedInput.validate();

      expect(validatedInput.state.errors.length).toBeGreaterThan(0);
      expect(validatedInput.state.isValid).toBe(false);
    });

    test('should validate on blur when enabled', async () => {
      validatedInput.validateOnBlur = true;
      const mockEvent = { target: { value: '' } };
      const onBlur = jest.fn();
      validatedInput.props.onBlur = onBlur;

      validatedInput.handleBlur(mockEvent);
      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async validation

      expect(onBlur).toHaveBeenCalled();
    });

    test('should reset validation state', () => {
      validatedInput.setState({
        errors: ['Error'],
        isValid: false,
        isTouched: true
      });

      validatedInput.resetValidation();

      expect(validatedInput.state.errors).toEqual([]);
      expect(validatedInput.state.isValid).toBe(true);
      expect(validatedInput.state.isTouched).toBe(false);
    });

    test('should get validation state', () => {
      const state = validatedInput.getValidationState();

      expect(state).toHaveProperty('isValid');
      expect(state).toHaveProperty('errors');
      expect(state).toHaveProperty('isTouched');
      expect(state).toHaveProperty('value');
    });
  });

  describe('Validation Functions', () => {
    describe('required validator', () => {
      test('should validate required fields', () => {
        const validator = validators.required('Field is required');

        expect(validator('')).toEqual({ type: 'required', message: 'Field is required' });
        expect(validator('   ')).toEqual({ type: 'required', message: 'Field is required' });
        expect(validator('value')).toBe(true);
      });
    });

    describe('minLength validator', () => {
      test('should validate minimum length', () => {
        const validator = validators.minLength(5);

        expect(validator('abc')).toEqual({
          type: 'minLength',
          message: 'Must be at least 5 characters long'
        });
        expect(validator('abcdef')).toBe(true);
      });
    });

    describe('maxLength validator', () => {
      test('should validate maximum length', () => {
        const validator = validators.maxLength(3);

        expect(validator('abcd')).toEqual({
          type: 'maxLength',
          message: 'Must be no more than 3 characters long'
        });
        expect(validator('abc')).toBe(true);
      });
    });

    describe('email validator', () => {
      test('should validate email format', () => {
        const validator = validators.email();

        expect(validator('invalid-email')).toEqual({
          type: 'pattern',
          message: 'Please enter a valid email address'
        });
        expect(validator('test@example.com')).toBe(true);
      });
    });

    describe('custom validator', () => {
      test('should handle custom validation logic', async () => {
        const customValidator = validators.custom(
          (value) => value === 'special' ? true : 'Must be special',
          'Custom error'
        );

        const result1 = await customValidator('normal');
        expect(result1).toEqual({ type: 'custom', message: 'Custom error' });

        const result2 = await customValidator('special');
        expect(result2).toBe(true);
      });

      test('should handle async custom validators', async () => {
        const asyncValidator = validators.custom(
          async (value) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return value.length > 5 ? true : 'Too short';
          }
        );

        const result = await asyncValidator('abc');
        expect(result).toEqual({ type: 'custom', message: 'Too short' });
      });
    });
  });

  describe('FormValidator', () => {
    let formValidator;

    beforeEach(() => {
      formValidator = new FormValidator();
      formValidator
        .registerField('email', [validators.required(), validators.email()])
        .registerField('password', [validators.required(), validators.minLength(8)]);
    });

    test('should register fields', () => {
      expect(formValidator.fields.size).toBe(2);
      expect(formValidator.fields.has('email')).toBe(true);
      expect(formValidator.fields.has('password')).toBe(true);
    });

    test('should validate single field', async () => {
      const isValid = await formValidator.validateField('email', 'invalid-email');

      expect(isValid).toBe(false);
      expect(formValidator.getFieldErrors('email').length).toBeGreaterThan(0);
    });

    test('should validate all fields', async () => {
      const values = {
        email: 'test@example.com',
        password: 'short'
      };

      const result = await formValidator.validateAll(values);

      expect(result.isValid).toBe(false);
      expect(result.fields.email.isValid).toBe(true);
      expect(result.fields.password.isValid).toBe(false);
    });

    test('should clear errors', () => {
      formValidator.errors.set('email', ['Error']);

      formValidator.clearErrors();

      expect(formValidator.errors.size).toBe(0);
    });

    test('should clear field-specific errors', () => {
      formValidator.errors.set('email', ['Error']);
      formValidator.errors.set('password', ['Error']);

      formValidator.clearFieldErrors('email');

      expect(formValidator.errors.has('email')).toBe(false);
      expect(formValidator.errors.has('password')).toBe(true);
    });
  });

  describe('StorageError', () => {
    test('should create storage error with user message', () => {
      const error = new StorageError(
        'Technical error message',
        'QUOTA_EXCEEDED',
        new Error('Original error')
      );

      expect(error.name).toBe('StorageError');
      expect(error.code).toBe('QUOTA_EXCEEDED');
      expect(error.getUserMessage()).toBe('Storage space is full. Please clear some data or try again later.');
    });

    test('should provide debug information', () => {
      const originalError = new Error('Original error');
      const error = new StorageError('Test error', 'TEST_CODE', originalError);

      const debugInfo = error.getDebugInfo();

      expect(debugInfo).toHaveProperty('message');
      expect(debugInfo).toHaveProperty('code');
      expect(debugInfo).toHaveProperty('userMessage');
      expect(debugInfo).toHaveProperty('timestamp');
      expect(debugInfo.originalError).toHaveProperty('name');
    });
  });

  describe('StorageService Error Handling', () => {
    let storageService;
    let mockLocalStorage;

    beforeEach(() => {
      mockLocalStorage = {
        setItem: jest.fn(),
        getItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn()
      };

      global.localStorage = mockLocalStorage;

      storageService = new StorageService({
        enableErrorReporting: true,
        onUserError: jest.fn()
      });
    });

    test('should handle quota exceeded errors', async () => {
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      quotaError.code = 22;

      mockLocalStorage.setItem.mockImplementation(() => {
        throw quotaError;
      });

      try {
        await storageService.setItem('test', 'value');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect(error.code).toBe('QUOTA_EXCEEDED');
        expect(error.getUserMessage()).toContain('Storage space is full');
      }
    });

    test('should handle serialization errors', () => {
      const circularObj = {};
      circularObj.self = circularObj;

      expect(() => {
        storageService._serialize(circularObj);
      }).toThrow(StorageError);
    });

    test('should handle deserialization errors', () => {
      expect(() => {
        storageService._deserialize('invalid json');
      }).toThrow(StorageError);
    });

    test('should track error history', async () => {
      const error = new StorageError('Test error', 'TEST_CODE');
      storageService._handleStorageError(error, 'test operation');

      const history = storageService.getErrorHistory();
      expect(history.length).toBe(1);
      expect(history[0].operation).toBe('test operation');
    });

    test('should provide error statistics', () => {
      const error1 = new StorageError('Error 1', 'CODE_1');
      const error2 = new StorageError('Error 2', 'CODE_2');

      storageService._handleStorageError(error1, 'op1');
      storageService._handleStorageError(error2, 'op2');

      const stats = storageService.getErrorStats();

      expect(stats.total).toBe(2);
      expect(stats.types).toHaveProperty('CODE_1');
      expect(stats.types).toHaveProperty('CODE_2');
    });

    test('should test storage functionality', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {});
      mockLocalStorage.getItem.mockImplementation(() => '{"test":true,"timestamp":123}');
      mockLocalStorage.removeItem.mockImplementation(() => {});

      const testResults = await storageService.testStorage();

      expect(testResults.canWrite).toBe(true);
      expect(testResults.canRead).toBe(true);
      expect(testResults.canDelete).toBe(true);
      expect(testResults.errors).toEqual([]);
    });

    test('should attempt error recovery', async () => {
      const recoveryMessage = await storageService.recoverFromError('QUOTA_EXCEEDED');

      expect(recoveryMessage).toContain('cleanup completed');
    });
  });

  describe('DevErrorDisplay Component', () => {
    let devErrorDisplay;
    let testError;

    beforeEach(() => {
      testError = new Error('Test development error');
      testError.stack = `Error: Test development error
    at TestComponent.render (test.js:10:5)
    at Component.update (component.js:25:10)`;

      devErrorDisplay = new DevErrorDisplay({
        error: testError,
        errorInfo: {
          component: 'TestComponent',
          timestamp: '2023-01-01T00:00:00.000Z'
        },
        isDevelopment: true
      });
    });

    test('should initialize in development mode', () => {
      expect(devErrorDisplay.isDevelopment).toBe(true);
      expect(devErrorDisplay.state.showStackTrace).toBe(true);
    });

    test('should not render in production mode', () => {
      const prodDisplay = new DevErrorDisplay({
        error: testError,
        isDevelopment: false
      });

      const rendered = prodDisplay.render();
      expect(rendered.props.style.display).toBe('none');
    });

    test('should parse stack trace', () => {
      const frames = devErrorDisplay._parseStackTrace(testError.stack);

      expect(frames.length).toBeGreaterThan(0);
      expect(frames[0]).toHaveProperty('function');
      expect(frames[0]).toHaveProperty('file');
      expect(frames[0]).toHaveProperty('line');
      expect(frames[0]).toHaveProperty('column');
    });

    test('should generate error suggestions', () => {
      const referenceError = new Error('variable is not defined');
      referenceError.name = 'ReferenceError';

      const suggestions = devErrorDisplay._generateSuggestions(referenceError);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('declared'))).toBe(true);
    });

    test('should copy error information', async () => {
      await devErrorDisplay.copyErrorInfo();

      expect(mockWindow.navigator.clipboard.writeText).toHaveBeenCalled();
      const copiedText = mockWindow.navigator.clipboard.writeText.mock.calls[0][0];
      expect(copiedText).toContain('TodoLang Error Report');
      expect(copiedText).toContain(testError.message);
    });

    test('should report error', () => {
      devErrorDisplay.reportError();

      expect(mockGlobalErrorReporter.reportRuntimeError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          userReported: true,
          developmentMode: true
        })
      );
    });
  });

  describe('DevErrorOverlay Component', () => {
    let devErrorOverlay;
    let testError;

    beforeEach(() => {
      testError = new Error('Critical test error');
      devErrorOverlay = new DevErrorOverlay({
        error: testError,
        errorInfo: { component: 'TestComponent' }
      });
    });

    test('should initialize as visible', () => {
      expect(devErrorOverlay.state.isVisible).toBe(true);
    });

    test('should handle dismissal', () => {
      const onDismiss = jest.fn();
      devErrorOverlay.props.onDismiss = onDismiss;

      devErrorOverlay.handleDismiss();

      expect(devErrorOverlay.state.isVisible).toBe(false);
      expect(onDismiss).toHaveBeenCalled();
    });

    test('should handle page reload', () => {
      devErrorOverlay.handleReload();

      expect(mockWindow.location.reload).toHaveBeenCalled();
    });

    test('should not render when not visible', () => {
      devErrorOverlay.setState({ isVisible: false });
      const rendered = devErrorOverlay.render();

      expect(rendered.props.style.display).toBe('none');
    });
  });

  describe('DevErrorHandler', () => {
    let devErrorHandler;

    beforeEach(() => {
      devErrorHandler = new DevErrorHandler();
      devErrorHandler.isDevelopment = true;
    });

    afterEach(() => {
      if (devErrorHandler.currentOverlay) {
        devErrorHandler.hideErrorOverlay();
      }
    });

    test('should show error overlay in development', () => {
      const testError = new Error('Test error');

      devErrorHandler.showErrorOverlay(testError);

      expect(devErrorHandler.currentOverlay).toBeDefined();
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
    });

    test('should not show overlay in production', () => {
      devErrorHandler.isDevelopment = false;
      const testError = new Error('Test error');

      devErrorHandler.showErrorOverlay(testError);

      expect(devErrorHandler.currentOverlay).toBeNull();
    });

    test('should hide error overlay', () => {
      const testError = new Error('Test error');
      devErrorHandler.showErrorOverlay(testError);

      devErrorHandler.hideErrorOverlay();

      expect(devErrorHandler.currentOverlay).toBeNull();
    });

    test('should handle unhandled errors', () => {
      const testError = new Error('Unhandled error');

      devErrorHandler.handleUnhandledError(testError, 'test');

      expect(mockGlobalErrorReporter.reportRuntimeError).toHaveBeenCalledWith(
        testError,
        expect.objectContaining({
          source: 'test',
          global: true
        })
      );
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete error workflow', async () => {
      // Create error boundary with validation
      const errorBoundary = new ErrorBoundary({
        enableReporting: true,
        maxRetries: 2
      });

      // Create validated input with error
      const validatedInput = new ValidatedInput({
        validators: [validators.required()],
        validateOnChange: true
      });

      // Trigger validation error
      const changeEvent = { target: { value: '' } };
      validatedInput.handleChange(changeEvent);
      await validatedInput.validate();

      expect(validatedInput.state.isValid).toBe(false);
      expect(validatedInput.state.errors.length).toBeGreaterThan(0);

      // Trigger component error
      const componentError = new Error('Component error');
      errorBoundary.onError(componentError, 'render');

      expect(errorBoundary.state.hasError).toBe(true);
      expect(mockGlobalErrorReporter.reportRuntimeError).toHaveBeenCalled();

      // Test recovery
      errorBoundary.handleRetry();
      expect(errorBoundary.state.retryCount).toBe(1);
    });

    test('should handle storage error with user feedback', async () => {
      const userErrorCallback = jest.fn();
      const storageService = new StorageService({
        onUserError: userErrorCallback
      });

      // Mock storage failure
      global.localStorage.setItem = jest.fn(() => {
        const error = new Error('Storage failed');
        error.name = 'QuotaExceededError';
        throw error;
      });

      try {
        await storageService.setItem('test', 'value');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect(userErrorCallback).toHaveBeenCalled();
        expect(mockGlobalErrorReporter.reportRuntimeError).toHaveBeenCalled();
      }
    });

    test('should provide comprehensive error reporting', () => {
      const errors = [];

      // Collect various error types
      try {
        throw new Error('Runtime error');
      } catch (error) {
        errors.push({ type: 'runtime', error });
      }

      try {
        const validator = validators.required();
        const result = validator('');
        if (result !== true) {
          errors.push({ type: 'validation', error: result });
        }
      } catch (error) {
        errors.push({ type: 'validation', error });
      }

      try {
        const storageError = new StorageError('Storage failed', 'QUOTA_EXCEEDED');
        throw storageError;
      } catch (error) {
        errors.push({ type: 'storage', error });
      }

      expect(errors.length).toBe(3);
      expect(errors[0].type).toBe('runtime');
      expect(errors[1].type).toBe('validation');
      expect(errors[2].type).toBe('storage');
      expect(errors[2].error.getUserMessage()).toContain('Storage space is full');
    });
  });
});