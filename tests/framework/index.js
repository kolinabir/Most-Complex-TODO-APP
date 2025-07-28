/**
 * Framework Tests Index
 *
 * Runs all framework-related tests including state lleagement,
 * component system, virtual DOM, routing, and storage.
 */

import { JSDOM } from 'jsdom';

// Set up DOM environment for testing
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;

// Mock performance API
global.performance = {
  now: () => Date.now()
};

/**
 * Simple test framework for component tests
 */
class SimpleTestFramework {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };
    this.currentSuite = null;
    this.beforeEachFn = null;
    this.afterEachFn = null;
  }

  describe(name, fn) {
    console.log(`\n📦 ${name}`);
    this.currentSuite = name;
    fn();
    this.currentSuite = null;
  }

  beforeEach(fn) {
    this.beforeEachFn = fn;
  }

  afterEach(fn) {
    this.afterEachFn = fn;
  }

  test(name, fn) {
    this.results.total++;

    try {
      // Run beforeEach if defined
      if (this.beforeEachFn) {
        this.beforeEachFn();
      }

      // Run the test
      fn();

      // Run afterEach if defined
      if (this.afterEachFn) {
        this.afterEachFn();
      }

      console.log(`  ✅ ${name}`);
      this.results.passed++;
    } catch (error) {
      console.log(`  ❌ ${name}: ${error.message}`);
      this.results.failed++;
    }
  }

  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${actual} to be ${expected}`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected ${actual} to be truthy`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected ${actual} to be falsy`);
        }
      },
      toBeNull: () => {
        if (actual !== null) {
          throw new Error(`Expected ${actual} to be null`);
        }
      },
      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error(`Expected ${actual} to be defined`);
        }
      },
      toBeInstanceOf: (expectedClass) => {
        if (!(actual instanceof expectedClass)) {
          throw new Error(`Expected ${actual} to be instance of ${expectedClass.name}`);
        }
      },
      toContain: (expected) => {
        if (Array.isArray(actual)) {
          if (!actual.includes(expected)) {
            throw new Error(`Expected array to contain ${expected}`);
          }
        } else if (typeof actual === 'string') {
          if (!actual.includes(expected)) {
            throw new Error(`Expected string to contain ${expected}`);
          }
        } else {
          throw new Error(`Cannot check contains on ${typeof actual}`);
        }
      },
      toHaveLength: (expected) => {
        if (actual.length !== expected) {
          throw new Error(`Expected length ${actual.length} to be ${expected}`);
        }
      },
      toHaveProperty: (property, value) => {
        if (!(property in actual)) {
          throw new Error(`Expected object to have property ${property}`);
        }
        if (value !== undefined && actual[property] !== value) {
          throw new Error(`Expected property ${property} to be ${value}, got ${actual[property]}`);
        }
      },
      toHaveBeenCalled: () => {
        if (!actual.mock || actual.mock.calls.length === 0) {
          throw new Error('Expected function to have been called');
        }
      },
      toHaveBeenCalledWith: (...args) => {
        if (!actual.mock || actual.mock.calls.length === 0) {
          throw new Error('Expected function to have been called');
        }
        const lastCall = actual.mock.calls[actual.mock.calls.length - 1];
        if (JSON.stringify(lastCall) !== JSON.stringify(args)) {
          throw new Error(`Expected function to have been called with ${JSON.stringify(args)}, got ${JSON.stringify(lastCall)}`);
        }
      },
      not: {
        toBe: (expected) => {
          if (actual === expected) {
            throw new Error(`Expected ${actual} not to be ${expected}`);
          }
        },
        toHaveBeenCalled: () => {
          if (actual.mock && actual.mock.calls.length > 0) {
            throw new Error('Expected function not to have been called');
          }
        }
      },
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toThrow: (expectedMessage) => {
        if (typeof actual !== 'function') {
          throw new Error('Expected a function to test for throwing');
        }
        try {
          actual();
          throw new Error('Expected function to throw an error');
        } catch (error) {
          if (expectedMessage && !error.message.includes(expectedMessage)) {
            throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`);
          }
        }
      },
      stringContaining: (expected) => {
        return {
          asymmetricMatch: (actual) => {
            return typeof actual === 'string' && actual.includes(expected);
          }
        };
      }
    };
  }

  // Mock jest functions
  fn(implementation) {
    const mockFn = implementation || (() => {});
    mockFn.mock = {
      calls: [],
      results: []
    };

    const wrappedFn = (...args) => {
      mockFn.mock.calls.push(args);
      try {
        const result = mockFn(...args);
        mockFn.mock.results.push({ type: 'return', value: result });
        return result;
      } catch (error) {
        mockFn.mock.results.push({ type: 'throw', value: error });
        throw error;
      }
    };

    wrappedFn.mock = mockFn.mock;
    return wrappedFn;
  }

  spyOn(object, method) {
    const original = object[method];
    const spy = this.fn(original);
    object[method] = spy;

    spy.mockImplementation = (impl) => {
      spy.mock.implementation = impl;
      return spy;
    };

    spy.mockRestore = () => {
      object[method] = original;
    };

    return spy;
  }
}

// Set up global test functions
const testFramework = new SimpleTestFramework();
global.describe = testFramework.describe.bind(testFramework);
global.test = testFramework.test.bind(testFramework);
global.beforeEach = testFramework.beforeEach.bind(testFramework);
global.afterEach = testFramework.afterEach.bind(testFramework);

// Enhanced expect function with static methods
const expectFn = testFramework.expect.bind(testFramework);
expectFn.stringContaining = (expected) => ({
  asymmetricMatch: (actual) => typeof actual === 'string' && actual.includes(expected),
  toString: () => `stringContaining("${expected}")`
});

global.expect = expectFn;
global.jest = {
  fn: testFramework.fn.bind(testFramework),
  spyOn: testFramework.spyOn.bind(testFramework)
};

/**
 * Run all framework tests
 */
export async function runFrameworkTests() {
  console.log('🏗️  Running Framework Tests...');

  try {
    // Import and run component tests
    await import('./components/component.test.js');

    // TODO: Add other framework tests as they are implemented
    // await import('./state/state.test.js');
    // await import('./router/router.test.js');
    // await import('./storage/storage.test.js');

    return testFramework.results;
  } catch (error) {
    console.error('Error running framework tests:', error);
    testFramework.results.failed++;
    testFramework.results.total++;
    return testFramework.results;
  }
}