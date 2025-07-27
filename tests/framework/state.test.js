/**
 * Unit Tests for Custom Reactive State Management System
 */

import { TodoLangStateManager, ReactiveState } from '../../src/framework/state/index.js';

// Simple test framework
class TestFramework {
  constructor() {
    this.tests = [];
    this.results = { passed: 0, failed: 0, total: 0 };
    this.currentSuite = '';
  }

  describe(name, fn) {
    this.currentSuite = name;
    console.log(`\n--- ${name} ---`);
    fn();
  }

  test(name, fn) {
    this.tests.push({ name: `${this.currentSuite}: ${name}`, fn });
  }

  beforeEach(fn) {
    this.beforeEachFn = fn;
  }

  async run() {
    for (const test of this.tests) {
      try {
        if (this.beforeEachFn) {
          this.beforeEachFn();
        }

        await test.fn();
        console.log(`  ✅ ${test.name}`);
        this.results.passed++;
      } catch (error) {
        console.log(`  ❌ ${test.name}: ${error.message}`);
        this.results.failed++;
      }
      this.results.total++;
    }

    console.log(`\n📊 Results: ${this.results.passed}/${this.results.total} passed`);
    return this.results.failed === 0;
  }

  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
      },
      toHaveLength: (expected) => {
        if (actual.length !== expected) {
          throw new Error(`Expected length ${expected}, got ${actual.length}`);
        }
      },
      toHaveProperty: (prop) => {
        if (!(prop in actual)) {
          throw new Error(`Expected object to have property ${prop}`);
        }
      },
      toBeInstanceOf: (constructor) => {
        if (!(actual instanceof constructor)) {
          throw new Error(`Expected instance of ${constructor.name}`);
        }
      }
    };
  }
}

const framework = new TestFramework();

// Helper function to wait for async operations
function waitFor(ms = 10) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test setup
let stateManager;

framework.beforeEach(() => {
  stateManager = new TodoLangStateManager();
});

framework.describe('State Creation', () => {
  framework.test('should create reactive state from initial object', () => {
    const initialState = { count: 0, name: 'test' };
    const state = stateManager.createState(initialState);

    framework.expect(state.count).toBe(0);
    framework.expect(state.name).toBe('test');
  });

  framework.test('should handle nested objects', () => {
    const initialState = {
      user: {
        name: 'John',
        settings: { theme: 'dark' }
      }
    };
    const state = stateManager.createState(initialState);

    framework.expect(state.user.name).toBe('John');
    framework.expect(state.user.settings.theme).toBe('dark');
  });
});

framework.describe('State Reactivity', () => {
  framework.test('should detect simple property changes', async () => {
    const state = stateManager.createState({ count: 0 });
    let changeDetected = false;

    stateManager.subscribe((changes) => {
      framework.expect(changes).toHaveLength(1);
      framework.expect(changes[0].path).toBe('count');
      framework.expect(changes[0].newValue).toBe(1);
      changeDetected = true;
    });

    state.count = 1;
    await waitFor();

    if (!changeDetected) {
      throw new Error('Change was not detected');
    }
  });

  framework.test('should detect nested property changes', async () => {
    const state = stateManager.createState({
      user: { name: 'John' }
    });
    let changeDetected = false;

    stateManager.subscribe((changes) => {
      framework.expect(changes[0].path).toBe('user.name');
      framework.expect(changes[0].newValue).toBe('Jane');
      changeDetected = true;
    });

    state.user.name = 'Jane';
    await waitFor();

    if (!changeDetected) {
      throw new Error('Nested change was not detected');
    }
  });
});

framework.describe('Subscription System', () => {
  framework.test('should support global subscriptions', async () => {
    const state = stateManager.createState({ value: 1 });
    let changeDetected = false;

    stateManager.subscribe((changes) => {
      framework.expect(changes).toHaveLength(1);
      changeDetected = true;
    });

    state.value = 2;
    await waitFor();

    if (!changeDetected) {
      throw new Error('Global subscription did not work');
    }
  });

  framework.test('should return unsubscribe function', async () => {
    const state = stateManager.createState({ value: 1 });
    let callCount = 0;

    const unsubscribe = stateManager.subscribe(() => {
      callCount++;
    });

    state.value = 2;
    await waitFor();

    unsubscribe();

    state.value = 3;
    await waitFor();

    framework.expect(callCount).toBe(1);
  });
});

framework.describe('State Updates', () => {
  framework.test('should update state using updateState method', () => {
    const state = stateManager.createState({ count: 0 }, 'test');

    stateManager.updateState('count', 5);

    framework.expect(state.count).toBe(5);
  });

  framework.test('should update nested state using dot notation', () => {
    const state = stateManager.createState({
      user: { name: 'John', age: 30 }
    }, 'test');

    stateManager.updateState('user.name', 'Jane');

    framework.expect(state.user.name).toBe('Jane');
    framework.expect(state.user.age).toBe(30);
  });
});

framework.describe('Todo Application Scenarios', () => {
  framework.test('should handle todo state structure', async () => {
    const todoState = stateManager.createState({
      todos: [],
      filter: 'all'
    }, 'todoApp');
    let changeDetected = false;

    stateManager.subscribe((changes) => {
      framework.expect(changes[0].path).toBe('todos.0');
      changeDetected = true;
    });

    todoState.todos.push({
      id: '1',
      text: 'Test todo',
      completed: false
    });

    await waitFor();

    if (!changeDetected) {
      throw new Error('Todo addition was not detected');
    }
  });

  framework.test('should handle computed properties pattern', () => {
    const state = stateManager.createState({
      todos: [
        { id: '1', completed: false },
        { id: '2', completed: true }
      ],
      filter: 'active'
    });

    const getFilteredTodos = () => {
      return state.todos.filter(todo => {
        if (state.filter === 'active') return !todo.completed;
        if (state.filter === 'completed') return todo.completed;
        return true;
      });
    };

    framework.expect(getFilteredTodos()).toHaveLength(1);

    state.filter = 'completed';
    framework.expect(getFilteredTodos()).toHaveLength(1);

    state.filter = 'all';
    framework.expect(getFilteredTodos()).toHaveLength(2);
  });
});

// Run the tests
console.log('🧪 Running State Management Tests...');
framework.run().then(success => {
  if (success) {
    console.log('\n🎉 All state management tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});