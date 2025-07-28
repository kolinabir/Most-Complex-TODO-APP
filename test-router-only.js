#!/usr/bin/env node

/**
 * Simple Router Test Runner
 * Just for testing the router implementation
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
 * Simple test framework for router tests
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
      not: {
        toContain: (expected) => {
          if (Array.isArray(actual)) {
            if (actual.includes(expected)) {
              throw new Error(`Expected array not to contain ${expected}`);
            }
          } else if (typeof actual === 'string') {
            if (actual.includes(expected)) {
              throw new Error(`Expected string not to contain ${expected}`);
            }
          }
        }
      },
      toBeLessThan: (expected) => {
        if (actual >= expected) {
          throw new Error(`Expected ${actual} to be less than ${expected}`);
        }
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
}

// Set up global test functions
const testFramework = new SimpleTestFramework();
global.describe = testFramework.describe.bind(testFramework);
global.test = testFramework.test.bind(testFramework);
global.beforeEach = testFramework.beforeEach.bind(testFramework);
global.afterEach = testFramework.afterEach.bind(testFramework);
global.expect = testFramework.expect.bind(testFramework);
global.jest = {
  fn: testFramework.fn.bind(testFramework)
};

// Run router tests
async function runRouterTests() {
  console.log('🧪 Running Router Tests...\n');

  try {
    // Import and run router tests
    await import('./tests/framework/router.test.js');

    console.log('\n' + '='.repeat(50));
    console.log('📊 Router Test Results');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${testFramework.results.total}`);
    console.log(`✅ Passed: ${testFramework.results.passed}`);
    console.log(`❌ Failed: ${testFramework.results.failed}`);

    if (testFramework.results.failed === 0) {
      console.log('\n🎉 All router tests passed!');
    } else {
      console.log(`\n⚠️  ${testFramework.results.failed} test(s) failed`);
    }

    return testFramework.results.failed === 0;
  } catch (error) {
    console.error('Error running router tests:', error);
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runRouterTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}