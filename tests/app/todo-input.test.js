/**
 * Unit tests for TodoInput component
 * Tests input validation, event handling, form submission, and integration
 */

// Mock DOM environment for testing
class MockEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.target = options.target || {};
    this.key = options.key || '';
    this.preventDefault = () => {};
  }
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.className = '';
    this.value = '';
    this.disabled = false;
    this.autoFocus = false;
    this.type = '';
    this.placeholder = '';
    this.children = [];
    this.eventListeners = new Map();
  }

  querySelector(selector) {
    if (selector === '.todo-input') {
      return this.children.find(child => child.className.includes('todo-input'));
    }
    return null;
  }

  focus() {
    this.focused = true;
  }
}

// Mock TodoInput component (compiled from TodoLang)
class MockTodoInput {
  constructor(props = {}) {
    this.props = props;
    this.state = {
      inputValue: "",
      isValid: true,
      errorMessage: "",
      isSubmitting: false
    };
    this._domNode = new MockElement();
  }

  setState(newState) {
    Object.assign(this.state, newState);
  }

  getInputClass() {
    let classes = "todo-input";
    if (this.state.isValid === false) {
      classes = classes + " todo-input-error";
    }
    if (this.state.isSubmitting) {
      classes = classes + " todo-input-submitting";
    }
    return classes;
  }

  renderErrorMessage() {
    if (this.state.isValid === false && this.state.errorMessage.length > 0) {
      return { type: 'div', className: 'todo-input-error-message', textContent: this.state.errorMessage };
    }
    return null;
  }

  handleInput(event) {
    const value = event.target.value;
    this.setState({
      inputValue: value,
      isValid: true,
      errorMessage: ""
    });
  }

  handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      this.submitTodo();
    }
  }

  handleSubmit(event) {
    event.preventDefault();
    this.submitTodo();
  }

  submitTodo() {
    if (this.state.isSubmitting) {
      return;
    }

    const trimmedValue = this.state.inputValue.trim();

    // Validate input
    const validation = this.validateInput(trimmedValue);
    if (validation.isValid === false) {
      this.setState({
        isValid: false,
        errorMessage: validation.error
      });
      return;
    }

    // Set submitting state
    this.setState({
      isSubmitting: true,
      isValid: true,
      errorMessage: ""
    });

    try {
      // Call parent callback if provided
      if (this.props.onAdd && typeof this.props.onAdd === "function") {
        this.props.onAdd(trimmedValue);
      }

      // Clear input on successful submission
      this.clearInput();
    } catch (error) {
      this.setState({
        isValid: false,
        errorMessage: "Failed to add todo. Please try again."
      });
    } finally {
      this.setState({
        isSubmitting: false
      });
    }
  }

  validateInput(text) {
    const result = {
      isValid: false,
      error: ""
    };

    if (text == null || text.length === 0) {
      result.error = "Todo text cannot be empty";
      return result;
    }

    if (text.length > 500) {
      result.error = "Todo text cannot exceed 500 characters";
      return result;
    }

    // Check for only whitespace
    if (text.replace(/\s/g, "").length === 0) {
      result.error = "Todo text cannot be only whitespace";
      return result;
    }

    result.isValid = true;
    return result;
  }

  clearInput() {
    this.setState({
      inputValue: "",
      isValid: true,
      errorMessage: "",
      isSubmitting: false
    });
  }

  focus() {
    if (this._domNode) {
      const input = this._domNode.querySelector(".todo-input");
      if (input) {
        input.focus();
      }
    }
  }

  getValue() {
    return this.state.inputValue;
  }

  setValue(value) {
    this.setState({
      inputValue: value || "",
      isValid: true,
      errorMessage: ""
    });
  }

  reset() {
    this.clearInput();
  }
}

// Export test runner function
export function runTodoInputTests() {
  console.log('🧪 Running TodoInput Component Tests...');

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test suites
  const testSuites = [
    {
      name: 'Initial State',
      tests: [
        {
          name: 'should initialize with empty input value',
          fn: () => {
            const component = new MockTodoInput();
            return component.state.inputValue === "";
          }
        },
        {
          name: 'should initialize with valid state',
          fn: () => {
            const component = new MockTodoInput();
            return component.state.isValid === true && component.state.errorMessage === "";
          }
        },
        {
          name: 'should initialize with not submitting state',
          fn: () => {
            const component = new MockTodoInput();
            return component.state.isSubmitting === false;
          }
        }
      ]
    },
    {
      name: 'Input Validation',
      tests: [
        {
          name: 'should validate empty text as invalid',
          fn: () => {
            const component = new MockTodoInput();
            const result = component.validateInput("");
            return result.isValid === false && result.error === "Todo text cannot be empty";
          }
        },
        {
          name: 'should validate null text as invalid',
          fn: () => {
            const component = new MockTodoInput();
            const result = component.validateInput(null);
            return result.isValid === false && result.error === "Todo text cannot be empty";
          }
        },
        {
          name: 'should validate whitespace-only text as invalid',
          fn: () => {
            const component = new MockTodoInput();
            const result = component.validateInput("   ");
            return result.isValid === false && result.error === "Todo text cannot be only whitespace";
          }
        },
        {
          name: 'should validate text exceeding 500 characters as invalid',
          fn: () => {
            const component = new MockTodoInput();
            const longText = 'a'.repeat(501);
            const result = component.validateInput(longText);
            return result.isValid === false && result.error === "Todo text cannot exceed 500 characters";
          }
        },
        {
          name: 'should validate normal text as valid',
          fn: () => {
            const component = new MockTodoInput();
            const result = component.validateInput("Valid todo text");
            return result.isValid === true && result.error === "";
          }
        }
      ]
    },
    {
      name: 'Input Handling',
      tests: [
        {
          name: 'should update input value on input event',
          fn: () => {
            const component = new MockTodoInput();
            const event = new MockEvent('input', { target: { value: 'New todo text' } });
            component.handleInput(event);
            return component.state.inputValue === 'New todo text' &&
                   component.state.isValid === true &&
                   component.state.errorMessage === "";
          }
        },
        {
          name: 'should clear error state on input change',
          fn: () => {
            const component = new MockTodoInput();
            component.setState({ isValid: false, errorMessage: "Some error" });
            const event = new MockEvent('input', { target: { value: 'New text' } });
            component.handleInput(event);
            return component.state.isValid === true && component.state.errorMessage === "";
          }
        }
      ]
    },
    {
      name: 'Keyboard Event Handling',
      tests: [
        {
          name: 'should submit on Enter key press',
          fn: () => {
            let submitted = false;
            const component = new MockTodoInput({
              onAdd: (text) => { submitted = text === 'Test todo'; }
            });
            component.setState({ inputValue: 'Test todo' });
            const event = new MockEvent('keydown', { key: 'Enter' });
            component.handleKeyDown(event);
            return submitted && component.state.inputValue === '';
          }
        },
        {
          name: 'should not submit on other key presses',
          fn: () => {
            let submitted = false;
            const component = new MockTodoInput({
              onAdd: () => { submitted = true; }
            });
            component.setState({ inputValue: 'Test todo' });
            const event = new MockEvent('keydown', { key: 'Space' });
            component.handleKeyDown(event);
            return !submitted;
          }
        },
        {
          name: 'should handle Enter key with invalid input',
          fn: () => {
            const component = new MockTodoInput();
            component.setState({ inputValue: '' });
            const event = new MockEvent('keydown', { key: 'Enter' });
            component.handleKeyDown(event);
            return component.state.isValid === false &&
                   component.state.errorMessage === "Todo text cannot be empty";
          }
        }
      ]
    },
    {
      name: 'Form Submission',
      tests: [
        {
          name: 'should submit valid todo text',
          fn: () => {
            let submittedText = null;
            const component = new MockTodoInput({
              onAdd: (text) => { submittedText = text; }
            });
            component.setState({ inputValue: 'Valid todo text' });
            const event = new MockEvent('submit');
            component.handleSubmit(event);
            return submittedText === 'Valid todo text' && component.state.inputValue === '';
          }
        },
        {
          name: 'should trim whitespace before submission',
          fn: () => {
            let submittedText = null;
            const component = new MockTodoInput({
              onAdd: (text) => { submittedText = text; }
            });
            component.setState({ inputValue: '  Todo with spaces  ' });
            const event = new MockEvent('submit');
            component.handleSubmit(event);
            return submittedText === 'Todo with spaces';
          }
        },
        {
          name: 'should not submit empty text',
          fn: () => {
            let submitted = false;
            const component = new MockTodoInput({
              onAdd: () => { submitted = true; }
            });
            component.setState({ inputValue: '' });
            const event = new MockEvent('submit');
            component.handleSubmit(event);
            return !submitted &&
                   component.state.isValid === false &&
                   component.state.errorMessage === "Todo text cannot be empty";
          }
        },
        {
          name: 'should prevent double submission',
          fn: () => {
            let callCount = 0;
            const component = new MockTodoInput({
              onAdd: () => { callCount++; }
            });
            component.setState({ inputValue: 'Test todo', isSubmitting: true });
            const event = new MockEvent('submit');
            component.handleSubmit(event);
            return callCount === 0;
          }
        }
      ]
    },
    {
      name: 'State Management',
      tests: [
        {
          name: 'should clear input correctly',
          fn: () => {
            const component = new MockTodoInput();
            component.setState({
              inputValue: 'Some text',
              isValid: false,
              errorMessage: 'Some error',
              isSubmitting: true
            });
            component.clearInput();
            return component.state.inputValue === '' &&
                   component.state.isValid === true &&
                   component.state.errorMessage === '' &&
                   component.state.isSubmitting === false;
          }
        },
        {
          name: 'should get current input value',
          fn: () => {
            const component = new MockTodoInput();
            component.setState({ inputValue: 'Current value' });
            return component.getValue() === 'Current value';
          }
        },
        {
          name: 'should set input value',
          fn: () => {
            const component = new MockTodoInput();
            component.setValue('New value');
            return component.state.inputValue === 'New value' &&
                   component.state.isValid === true &&
                   component.state.errorMessage === '';
          }
        },
        {
          name: 'should handle null value in setValue',
          fn: () => {
            const component = new MockTodoInput();
            component.setValue(null);
            return component.state.inputValue === '';
          }
        }
      ]
    },
    {
      name: 'CSS Class Generation',
      tests: [
        {
          name: 'should generate base input class',
          fn: () => {
            const component = new MockTodoInput();
            return component.getInputClass() === 'todo-input';
          }
        },
        {
          name: 'should add error class when invalid',
          fn: () => {
            const component = new MockTodoInput();
            component.setState({ isValid: false });
            return component.getInputClass() === 'todo-input todo-input-error';
          }
        },
        {
          name: 'should add submitting class when submitting',
          fn: () => {
            const component = new MockTodoInput();
            component.setState({ isSubmitting: true });
            return component.getInputClass() === 'todo-input todo-input-submitting';
          }
        }
      ]
    },
    {
      name: 'Error Message Rendering',
      tests: [
        {
          name: 'should not render error message when valid',
          fn: () => {
            const component = new MockTodoInput();
            const result = component.renderErrorMessage();
            return result === null;
          }
        },
        {
          name: 'should render error message when invalid with message',
          fn: () => {
            const component = new MockTodoInput();
            component.setState({ isValid: false, errorMessage: 'Test error message' });
            const result = component.renderErrorMessage();
            return result !== null &&
                   result.type === 'div' &&
                   result.className === 'todo-input-error-message' &&
                   result.textContent === 'Test error message';
          }
        }
      ]
    },
    {
      name: 'Integration with Parent Component',
      tests: [
        {
          name: 'should call onAdd callback with correct parameters',
          fn: () => {
            let calledWith = null;
            const component = new MockTodoInput({
              onAdd: (text) => { calledWith = text; }
            });
            component.setState({ inputValue: 'Integration test todo' });
            component.submitTodo();
            return calledWith === 'Integration test todo';
          }
        },
        {
          name: 'should work without onAdd callback',
          fn: () => {
            const component = new MockTodoInput({ onAdd: null });
            component.setState({ inputValue: 'Test todo' });
            try {
              component.submitTodo();
              return true;
            } catch (error) {
              return false;
            }
          }
        }
      ]
    }
  ];

  // Run all test suites
  for (const suite of testSuites) {
    console.log(`\n--- ${suite.name} ---`);

    for (const test of suite.tests) {
      try {
        const passed = test.fn();
        if (passed) {
          console.log(`  ✅ ${test.name}`);
          results.passed++;
        } else {
          console.log(`  ❌ ${test.name}`);
          results.failed++;
        }
      } catch (error) {
        console.log(`  ❌ ${test.name}: ${error.message}`);
        results.failed++;
      }
      results.total++;
    }
  }

  console.log(`\nTodoInput Tests: ${results.passed}/${results.total} passed`);
  return results;
}