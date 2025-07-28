#!/usr/bin/env node

/**
 * Simple test runner for DI tests
 */

import { JSDOM } from 'jsdom';

// Set up DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;

// Simple test framework
class TestFramework {
  constructor() {
    this.results = { passed: 0, failed: 0, total: 0 };
    this.currentSuite = null;
    this.beforeEachFn = null;
  }

  describe(name, fn) {
    console.log(`\n📦 ${name}`);
    this.currentSuite = name;
    fn();
  }

  beforeEach(fn) {
    this.beforeEachFn = fn;
  }

  test(name, fn) {
    this.results.total++;
    try {
      if (this.beforeEachFn) this.beforeEachFn();
      fn();
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
        if (actual !== expected) throw new Error(`Expected ${actual} to be ${expected}`);
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
        }
      },
      toBeInstanceOf: (expectedClass) => {
        if (!(actual instanceof expectedClass)) {
          throw new Error(`Expected ${actual} to be instance of ${expectedClass.name}`);
        }
      },
      toContain: (expected) => {
        if (!actual.includes(expected)) {
          throw new Error(`Expected array to contain ${expected}`);
        }
      },
      toHaveLength: (expected) => {
        if (actual.length !== expected) {
          throw new Error(`Expected length ${actual.length} to be ${expected}`);
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
          if (expectedMessage) {
            if (expectedMessage instanceof RegExp) {
              if (!expectedMessage.test(error.message)) {
                throw new Error(`Expected error message to match ${expectedMessage}, got "${error.message}"`);
              }
            } else if (typeof expectedMessage === 'string') {
              if (!error.message.includes(expectedMessage)) {
                throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`);
              }
            }
          }
          // If we get here, the function threw as expected
          return;
        }
      },
      not: {
        toBe: (expected) => {
          if (actual === expected) throw new Error(`Expected ${actual} not to be ${expected}`);
        }
      },
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error(`Expected ${actual} to be defined`);
        }
      }
    };
  }
}

const framework = new TestFramework();
global.describe = framework.describe.bind(framework);
global.test = framework.test.bind(framework);
global.beforeEach = framework.beforeEach.bind(framework);
global.expect = framework.expect.bind(framework);

// Run DI tests
async function runDITests() {
  console.log('🧪 Running Dependency Injection Tests...');

  try {
    await import('./tests/framework/di/service-container.test.js');
    await import('./tests/framework/di/service-registry.test.js');
    await import('./tests/framework/di/integration.test.js');

    console.log(`\n📊 Results: ${framework.results.passed}/${framework.results.total} passed`);

    if (framework.results.failed === 0) {
      console.log('🎉 All DI tests passed!');
      process.exit(0);
    } else {
      console.log(`❌ ${framework.results.failed} tests failed`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error running DI tests:', error);
    process.exit(1);
  }
}

runDITests();