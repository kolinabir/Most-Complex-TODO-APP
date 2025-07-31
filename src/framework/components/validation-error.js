/**
 * Validation Error Display Components
 * Provides user-friendly validation error messages and input validation
 */

import { TodoLangComponent } from './component.js';
import { createElement } from './virtual-dom.js';

/**
 * Validation Error Display Component
 * Shows validation errors in a user-friendly format
 */
export class ValidationError extends TodoLangComponent {
  constructor(props = {}) {
    super(props);

    this.state = {
      isVisible: true,
      isDismissible: props.dismissible !== false,
      autoHide: props.autoHide || false,
      autoHideDelay: props.autoHideDelay || 5000
    };

    // Auto-hide timer
    this._autoHideTimer = null;

    // Bind methods
    this.handleDismiss = this.handleDismiss.bind(this);
  }

  mounted() {
    // Set up auto-hide if enabled
    if (this.state.autoHide && this.props.errors && this.props.errors.length > 0) {
      this._autoHideTimer = setTimeout(() => {
        this.setState({ isVisible: false });
      }, this.state.autoHideDelay);
    }
  }

  beforeUpdate() {
    // Clear existing timer
    if (this._autoHideTimer) {
      clearTimeout(this._autoHideTimer);
      this._autoHideTimer = null;
    }
  }

  updated() {
    // Reset auto-hide timer if errors changed
    if (this.state.autoHide && this.props.errors && this.props.errors.length > 0 && this.state.isVisible) {
      this._autoHideTimer = setTimeout(() => {
        this.setState({ isVisible: false });
      }, this.state.autoHideDelay);
    }
  }

  unmounted() {
    if (this._autoHideTimer) {
      clearTimeout(this._autoHideTimer);
    }
  }

  /**
   * Handle error dismissal
   */
  handleDismiss() {
    this.setState({ isVisible: false });

    if (this.props.onDismiss) {
      this.props.onDismiss();
    }
  }

  /**
   * Render validation errors
   */
  render() {
    const { errors = [], field, className = '', style = {} } = this.props;

    // Don't render if no errors or not visible
    if (!errors.length || !this.state.isVisible) {
      return createElement('div', { style: { display: 'none' } });
    }

    const errorElements = errors.map((error, index) => {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const errorType = typeof error === 'object' ? error.type : 'validation';
      const errorField = typeof error === 'object' ? error.field : field;

      return createElement('div', {
        key: `error-${index}`,
        class: `validation-error-item ${errorType}`,
        style: {
          display: 'flex',
          alignItems: 'center',
          marginBottom: index < errors.length - 1 ? '5px' : '0'
        }
      }, [
        // Error icon
        createElement('span', {
          class: 'error-icon',
          style: {
            marginRight: '8px',
            fontSize: '14px',
            color: '#ff6b6b'
          }
        }, ['⚠️']),

        // Error message
        createElement('span', {
          class: 'error-message',
          style: {
            flex: '1',
            fontSize: '14px',
            color: '#c92a2a'
          }
        }, [errorMessage]),

        // Field indicator (if specified)
        errorField ? createElement('span', {
          class: 'error-field',
          style: {
            marginLx',
            fontSize: '12px',
            color: '#868e96',
            fontStyle: 'italic'
          }
        }, [`(${errorField})`]) : null
      ]);
    });

    return createElement('div', {
      class: `validation-errors ${className}`,
      style: {
        padding: '12px',
        margin: '8px 0',
        backgroundColor: '#fff5f5',
        border: '1px solid #ffc9c9',
        borderRadius: '6px',
        borderLeft: '4px solid #ff6b6b',
        ...style
      }
    }, [
      // Error list
      createElement('div', { class: 'error-list' }, errorElements),

      // Dismiss button (if dismissible)
      this.state.isDismissible ? createElement('button', {
        class: 'dismiss-button',
        onclick: this.handleDismiss,
        style: {
          marginTop: '8px',
          padding: '4px 8px',
          fontSize: '12px',
          backgroundColor: 'transparent',
          border: '1px solid #ff6b6b',
          borderRadius: '4px',
          color: '#c92a2a',
          cursor: 'pointer',
          float: 'right'
        }
      }, ['Dismiss']) : null
    ]);
  }
}

/**
 * Input Validation Component
 * Wraps input elements with validation logic and error display
 */
export class ValidatedInput extends TodoLangComponent {
  constructor(props = {}) {
    super(props);

    this.state = {
      value: props.value || '',
      errors: [],
      isValid: true,
      isTouched: false,
      isValidating: false
    };

    // Validation rules
    this.validators = props.validators || [];
    this.validateOnChange = props.validateOnChange !== false;
    this.validateOnBlur = props.validateOnBlur !== false;
    this.showErrorsOnTouch = props.showErrorsOnTouch !== false;

    // Bind methods
    this.handleChange = this.handleChange.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.validate = this.validate.bind(this);
  }

  /**
   * Handle input change
   */
  handleChange(event) {
    const value = event.target.value;

    this.setState({
      value: value,
      isTouched: true
    });

    // Validate on change if enabled
    if (this.validateOnChange) {
      this.validate(value);
    }

    // Call parent onChange handler
    if (this.props.onChange) {
      this.props.onChange(event, value, this.state.isValid);
    }
  }

  /**
   * Handle input blur
   */
  handleBlur(event) {
    this.setState({ isTouched: true });

    // Validate on blur if enabled
    if (this.validateOnBlur) {
      this.validate(this.state.value);
    }

    // Call parent onBlur handler
    if (this.props.onBlur) {
      this.props.onBlur(event, this.state.value, this.state.isValid);
    }
  }

  /**
   * Handle input focus
   */
  handleFocus(event) {
    // Call parent onFocus handler
    if (this.props.onFocus) {
      this.props.onFocus(event, this.state.value, this.state.isValid);
    }
  }

  /**
   * Validate input value
   */
  async validate(value = this.state.value) {
    if (!this.validators.length) {
      this.setState({
        errors: [],
        isValid: true,
        isValidating: false
      });
      return true;
    }

    this.setState({ isValidating: true });

    const errors = [];

    for (const validator of this.validators) {
      try {
        const result = await this._runValidator(validator, value);
        if (result !== true) {
          errors.push(result);
        }
      } catch (error) {
        errors.push({
          type: 'validation-error',
          message: 'Validation failed: ' + error.message,
          field: this.props.name
        });
      }
    }

    const isValid = errors.length === 0;

    this.setState({
      errors: errors,
      isValid: isValid,
      isValidating: false
    });

    // Call validation callback
    if (this.props.onValidation) {
      this.props.onValidation(isValid, errors, value);
    }

    return isValid;
  }

  /**
   * Run individual validator
   */
  async _runValidator(validator, value) {
    if (typeof validator === 'function') {
      return await validator(value, this.props.name);
    }

    if (typeof validator === 'object' && validator.validate) {
      return await validator.validate(value, this.props.name);
    }

    throw new Error('Invalid validator format');
  }

  /**
   * Get validation state
   */
  getValidationState() {
    return {
      isValid: this.state.isValid,
      errors: this.state.errors,
      isTouched: this.state.isTouched,
      isValidating: this.state.isValidating,
      value: this.state.value
    };
  }

  /**
   * Reset validation state
   */
  resetValidation() {
    this.setState({
      errors: [],
      isValid: true,
      isTouched: false,
      isValidating: false
    });
  }

  /**
   * Force validation
   */
  forceValidation() {
    return this.validate();
  }

  /**
   * Render validated input
   */
  render() {
    const {
      type = 'text',
      placeholder = '',
      className = '',
      style = {},
      disabled = false,
      required = false,
      name,
      id,
      ...otherProps
    } = this.props;

    const showErrors = this.state.errors.length > 0 &&
                      (this.state.isTouched || !this.showErrorsOnTouch);

    const inputStyle = {
      width: '100%',
      padding: '8px 12px',
      border: `2px solid ${showErrors ? '#ff6b6b' : '#dee2e6'}`,
      borderRadius: '4px',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s ease',
      ...style
    };

    return createElement('div', {
      class: `validated-input-container ${className}`,
      style: { position: 'relative' }
    }, [
      // Input element
      createElement('input', {
        type: type,
        value: this.state.value,
        placeholder: placeholder,
        disabled: disabled || this.state.isValidating,
        required: required,
        name: name,
        id: id,
        style: inputStyle,
        onchange: this.handleChange,
        onblur: this.handleBlur,
        onfocus: this.handleFocus,
        ...otherProps
      }),

      // Validation indicator
      this.state.isValidating ? createElement('div', {
        class: 'validation-indicator',
        style: {
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '14px'
        }
      }, ['⏳']) : null,

      // Success indicator
      this.state.isValid && this.state.isTouched && !this.state.isValidating ?
        createElement('div', {
          class: 'validation-success',
          style: {
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '14px',
            color: '#51cf66'
          }
        }, ['✓']) : null,

      // Error display
      showErrors ? createElement(ValidationError, {
        errors: this.state.errors,
        field: name,
        dismissible: false,
        style: { marginTop: '4px' }
      }) : null
    ]);
  }
}

/**
 * Common validation functions
 */
export const validators = {
  /**
   * Required field validator
   */
  required: (message = 'This field is required') => {
    return (value) => {
      if (!value || (typeof value === 'string' && value.trim().length === 0)) {
        return { type: 'required', message };
      }
      return true;
    };
  },

  /**
   * Minimum length validator
   */
  minLength: (min, message) => {
    return (value) => {
      if (value && value.length < min) {
        return {
          type: 'minLength',
          message: message || `Must be at least ${min} characters long`
        };
      }
      return true;
    };
  },

  /**
   * Maximum length validator
   */
  maxLength: (max, message) => {
    return (value) => {
      if (value && value.length > max) {
        return {
          type: 'maxLength',
          message: message || `Must be no more than ${max} characters long`
        };
      }
      return true;
    };
  },

  /**
   * Pattern validator
   */
  pattern: (regex, message) => {
    return (value) => {
      if (value && !regex.test(value)) {
        return {
          type: 'pattern',
          message: message || 'Invalid format'
        };
      }
      return true;
    };
  },

  /**
   * Email validator
   */
  email: (message = 'Please enter a valid email address') => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return validators.pattern(emailRegex, message);
  },

  /**
   * Custom validator
   */
  custom: (validatorFn, message) => {
    return async (value, fieldName) => {
      try {
        const result = await validatorFn(value, fieldName);
        if (result !== true) {
          return {
            type: 'custom',
            message: message || result || 'Validation failed'
          };
        }
        return true;
      } catch (error) {
        return {
          type: 'custom',
          message: message || error.message || 'Validation error'
        };
      }
    };
  }
};

/**
 * Form validation helper
 */
export class FormValidator {
  constructor() {
    this.fields = new Map();
    this.errors = new Map();
  }

  /**
   * Register field for validation
   */
  registerField(name, validators = []) {
    this.fields.set(name, validators);
    return this;
  }

  /**
   * Validate single field
   */
  async validateField(name, value) {
    const fieldValidators = this.fields.get(name) || [];
    const errors = [];

    for (const validator of fieldValidators) {
      try {
        const result = await validator(value, name);
        if (result !== true) {
          errors.push(result);
        }
      } catch (error) {
        errors.push({
          type: 'validation-error',
          message: error.message,
          field: name
        });
      }
    }

    if (errors.length > 0) {
      this.errors.set(name, errors);
    } else {
      this.errors.delete(name);
    }

    return errors.length === 0;
  }

  /**
   * Validate all fields
   */
  async validateAll(values) {
    const results = {};

    for (const [name, validators] of this.fields) {
      const value = values[name];
      const isValid = await this.validateField(name, value);
      results[name] = {
        isValid,
        errors: this.errors.get(name) || []
      };
    }

    return {
      isValid: this.isValid(),
      fields: results,
      errors: this.getAllErrors()
    };
  }

  /**
   * Check if form is valid
   */
  isValid() {
    return this.errors.size === 0;
  }

  /**
   * Get all errors
   */
  getAllErrors() {
    const allErrors = {};
    for (const [field, errors] of this.errors) {
      allErrors[field] = errors;
    }
    return allErrors;
  }

  /**
   * Get errors for specific field
   */
  getFieldErrors(name) {
    return this.errors.get(name) || [];
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.errors.clear();
  }

  /**
   * Clear errors for specific field
   */
  clearFieldErrors(name) {
    this.errors.delete(name);
  }
}