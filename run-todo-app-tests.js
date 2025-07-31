#!/usr/bin/env node

/**
 * Simple test runner for TodoApp component tests
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple test framework
class SimpleTestRunner {
  constructor() {
    this.tests = [];
    this.describes = [];
    this.currentDescribe = null;
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  describe(name, fn) {
    const previousDescribe = this.currentDescribe;
    this.currentDescribe = name;
    console.log(`\n📦 ${name}`);

    try {
      fn();
    } catch (error) {
      console.error(`❌ Error in describe block "${name}":`, error.message);
      this.stats.errors.push({ describe: name, error: error.message });
    }

    this.currentDescribe = previousDescribe;
  }

  test(name, fn) {
    this.stats.total++;
    const fullName = this.currentDescribe ? `${this.currentDescribe} > ${name}` : name;

    try {
      fn();
      console.log(`  ✅ ${name}`);
      this.stats.passed++;
    } catch (error) {
      console.log(`  ❌ ${name}: ${error.message}`);
      this.stats.failed++;
      this.stats.errors.push({ test: fullName, error: error.message });
    }
  }

  beforeEach(fn) {
    this.beforeEachFn = fn;
  }

  afterEach(fn) {
    this.afterEachFn = fn;
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
      toHaveLength: (expected) => {
        if (!actual || actual.length !== expected) {
          throw new Error(`Expected length ${expected}, got ${actual ? actual.length : 'undefined'}`);
        }
      },
      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error('Expected value to be defined');
        }
      },
      toBeUndefined: () => {
        if (actual !== undefined) {
          throw new Error('Expected value to be undefined');
        }
      },
      toBeNull: () => {
        if (actual !== null) {
          throw new Error('Expected value to be null');
        }
      },
      toContain: (expected) => {
        if (!actual || !actual.includes(expected)) {
          throw new Error(`Expected "${actual}" to contain "${expected}"`);
        }
      },
      toThrow: () => {
        let threw = false;
        try {
          if (typeof actual === 'function') {
            actual();
          }
        } catch (error) {
          threw = true;
        }
        if (!threw) {
          throw new Error('Expected function to throw an error');
        }
      }
    };
  }

  printResults() {
    console.log('\n📊 Test Results:');
    console.log(`Total: ${this.stats.total}`);
    console.log(`Passed: ${this.stats.passed}`);
    console.log(`Failed: ${this.stats.failed}`);

    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.stats.errors.forEach(error => {
        console.log(`  - ${error.test || error.describe}: ${error.error}`);
      });
    }

    if (this.stats.failed === 0) {
      console.log('\n🎉 All tests passed!');
    }

    return this.stats.failed === 0;
  }
}

// Create global test functions
const runner = new SimpleTestRunner();
global.describe = runner.describe.bind(runner);
global.test = runner.test.bind(runner);
global.beforeEach = runner.beforeEach.bind(runner);
global.afterEach = runner.afterEach.bind(runner);
global.expect = runner.expect.bind(runner);

// Mock jest functions
global.jest = {
  fn: () => {
    const mockFn = function(...args) {
      mockFn.calls.push(args);
      return mockFn.returnValue;
    };
    mockFn.calls = [];
    mockFn.returnValue = undefined;
    return mockFn;
  },
  clearAllMocks: () => {
    // No-op for our simple runner
  }
};

// Load and run the test file
async function runTests() {
  console.log('🧪 TodoApp Component Test Runner\n');

  try {
    // Import the test file
    const testFilePath = join(__dirname, 'tests', 'app', 'todo-app.test.js');
    const testFileUrl = `file://${testFilePath.replace(/\\/g, '/')}`;
    console.log(`Loading test file: ${testFileUrl}`);
    await import(testFileUrl);

    // Print results
    const success = runner.printResults();
    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('❌ Failed to run tests:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();