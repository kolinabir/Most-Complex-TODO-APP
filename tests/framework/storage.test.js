/**
 * Storage Service Tests
 * Comprehensive tests for storage operations and error scenarios
 */

import { StorageService, StorageError } from '../../src/framework/storage/index.js';

// Mock localStorage for testing
class MockLocalStorage {
  constructor(shouldThrow = false, quotaExceeded = false) {
    this.store = new Map();
    this.shouldThrow = shouldThrow;
    this.quotaExceeded = quotaExceeded;
  }

  getItem(key) {
    if (this.shouldThrow) throw new Error('localStorage error');
    return this.store.get(key) || null;
  }

  setItem(key, value) {
    if (this.shouldThrow) throw new Error('localStorage error');
    if (this.quotaExceeded) {
      const error = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';
      error.code = 22;
      throw error;
    }
    this.store.set(key, value);
  }

  removeItem(key) {
    if (this.shouldThrow) throw new Error('localStorage error');
    this.store.delete(key);
  }

  clear() {
    if (this.shouldThrow) throw new Error('localStorage error');
    this.store.clear();
  }

  get length() {
    return this.store.size;
  }

  key(index) {
    return Array.from(this.store.keys())[index] || null;
  }

  hasOwnProperty(key) {
    return this.store.has(key);
  }

  *[Symbol.iterator]() {
    for (const key of this.store.keys()) {
      yield key;
    }
  }

  // Add keys() method for Object.keys() compatibility
  keys() {
    return this.store.keys();
  }
}

// Test runner
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('Running Storage Service Tests...\n');

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        console.log(`✓ ${name}`);
        this.passed++;
      } catch (error) {
        console.error(`✗ ${name}`);
        console.error(`  Error: ${error.message}`);
        if (error.stack) {
          console.error(`  Stack: ${error.stack.split('\n')[1]?.trim()}`);
        }
        this.failed++;
      }
    }

    console.log(`\nTest Results: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

// Helper functions
function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message = 'Values are not equal') {
  if (actual !== expected) {
    throw new Error(`${message}. Expected: ${expected}, Actual: ${actual}`);
  }
}

function assertThrows(fn, expectedError = Error, message = 'Expected function to throw') {
  try {
    fn();
    throw new Error(message);
  } catch (error) {
    if (!(error instanceof expectedError)) {
      throw new Error(`${message}. Expected ${expectedError.name}, got ${error.constructor.name}`);
    }
  }
}

async function assertThrowsAsync(fn, expectedError = Error, message = 'Expected async function to throw') {
  try {
    await fn();
    throw new Error(message);
  } catch (error) {
    if (!(error instanceof expectedError)) {
      throw new Error(`${message}. Expected ${expectedError.name}, got ${error.constructor.name}`);
    }
  }
}

// Test suite
const runner = new TestRunner();

// Basic functionality tests
runner.test('StorageService initializes correctly', () => {
  const originalLocalStorage = global.localStorage;
  global.localStorage = new MockLocalStorage();

  const storage = new StorageService();
  assert(storage instanceof StorageService, 'Should create StorageService instance');
  assert(typeof storage.isAvailable === 'boolean', 'Should have isAvailable property');

  global.localStorage = originalLocalStorage;
});

runner.test('StorageService detects localStorage unavailability', () => {
  const originalLocalStorage = global.localStorage;
  global.localStorage = new MockLocalStorage(true); // Will throw on access

  const storage = new StorageService();
  assertEqual(storage.isAvailable, false, 'Should detect localStorage unavailability');

  global.localStorage = originalLocalStorage;
});

// Serialization tests
runner.test('Serializes and deserializes simple data correctly', async () => {
  const originalLocalStorage = global.localStorage;
  global.localStorage = new MockLocalStorage();

  const storage = new StorageService();

  // Test various data types
  await storage.setItem('string', 'hello world');
  await storage.setItem('number', 42);
  await storage.setItem('boolean', true);
  await storage.setItem('null', null);
  await storage.setItem('array', [1, 2, 3]);
  await storage.setItem('object', { name: 'test', value: 123 });

  assertEqual(storage.getItem('string'), 'hello world');
  assertEqual(storage.getItem('number'), 42);
  assertEqual(storage.getItem('boolean'), true);
  assertEqual(storage.getItem('null'), null);

  const array = storage.getItem('array');
  assert(Array.isArray(array), 'Should deserialize array correctly');
  assertEqual(array.length, 3);
  assertEqual(array[0], 1);

  const obj = storage.getItem('object');
  assertEqual(obj.name, 'test');
  assertEqual(obj.value, 123);

  global.localStorage = originalLocalStorage;
});

runner.test('Handles complex nested objects', async () => {
  const originalLocalStorage = global.localStorage;
  global.localStorage = new MockLocalStorage();

  const storage = new StorageService();

  const complexData = {
    users: [
      { id: 1, name: 'John', preferences: { theme: 'dark', notifications: true } },
      { id: 2, name: 'Jane', preferences: { theme: 'light', notifications: false } }
    ],
    settings: {
      version: '1.0.0',
      features: ['feature1', 'feature2'],
      metadata: {
        created: new Date().toISOString(),
        updated: null
      }
    }
  };

  await storage.setItem('complex', complexData);
  const retrieved = storage.getItem('complex');

  assertEqual(retrieved.users.length, 2);
  assertEqual(retrieved.users[0].name, 'John');
  assertEqual(retrieved.users[0].preferences.theme, 'dark');
  assertEqual(retrieved.settings.version, '1.0.0');
  assert(Array.isArray(retrieved.settings.features));

  global.localStorage = originalLocalStorage;
});

// Error handling tests
runner.test('Throws StorageError for invalid keys', async () => {
  const storage = new StorageService();

  await assertThrowsAsync(() => storage.setItem('', 'value'), StorageError);
  await assertThrowsAsync(() => storage.setItem(null, 'value'), StorageError);
  await assertThrowsAsync(() => storage.setItem(123, 'value'), StorageError);

  assertThrows(() => storage.getItem(''), StorageError);
  assertThrows(() => storage.getItem(null), StorageError);
  assertThrows(() => storage.removeItem(''), StorageError);
});

runner.test('Handles serialization errors gracefully', async () => {
  const storage = new StorageService();

  // Create circular reference
  const circular = { name: 'test' };
  circular.self = circular;

  await assertThrowsAsync(() => storage.setItem('circular', circular), StorageError);
});

runner.test('Handles deserialization errors gracefully', () => {
  const originalLocalStorage = global.localStorage;
  const mockStorage = new MockLocalStorage();
  mockStorage.store.set('invalid', 'invalid json {');
  global.localStorage = mockStorage;

  const storage = new StorageService();

  assertThrows(() => storage.getItem('invalid'), StorageError);

  global.localStorage = originalLocalStorage;
});

// Fallback storage tests
runner.test('Uses fallback storage when localStorage unavailable', async () => {
  const originalLocalStorage = global.localStorage;
  global.localStorage = new MockLocalStorage(true);

  const storage = new StorageService();
  assertEqual(storage.isAvailable, false);

  await storage.setItem('test', 'fallback value');
  assertEqual(storage.getItem('test'), 'fallback value');

  assert(storage.hasItem('test'));

  storage.removeItem('test');
  assertEqual(storage.getItem('test'), null);

  global.localStorage = originalLocalStorage;
});

// Quota management tests
runner.test('Handles quota exceeded errors with cleanup', async () => {
  const originalLocalStorage = global.localStorage;

  // Create a special mock that passes availability check but fails on actual storage
  class QuotaExceededMockStorage extends MockLocalStorage {
    constructor() {
      super(false, false);
      this.quotaExceededOnSet = true;
    }

    setItem(key, value) {
      if (key === '__storage_test__') {
        // Allow the availability test to pass
        this.store.set(key, value);
        return;
      }

      if (this.quotaExceededOnSet) {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        error.code = 22;
        throw error;
      }

      this.store.set(key, value);
    }
  }

  const mockStorage = new QuotaExceededMockStorage();

  // Add some items that can be cleaned up
  mockStorage.store.set('temp_item1', 'value1');
  mockStorage.store.set('cache_item2', 'value2');
  mockStorage.store.set('normal_item', 'value3');

  global.localStorage = mockStorage;

  const storage = new StorageService();

  // Ensure localStorage is detected as available
  assert(storage.isAvailable, 'localStorage should be available for this test');

  // Should eventually throw StorageError after cleanup attempts
  try {
    await storage.setItem('new_item', 'value');
    throw new Error('Expected StorageError to be thrown');
  } catch (error) {
    assert(error instanceof StorageError, 'Should throw StorageError');
    assertEqual(error.code, 'QUOTA_EXCEEDED');
  }

  global.localStorage = originalLocalStorage;
});

runner.test('Provides quota information', async () => {
  const originalLocalStorage = global.localStorage;
  global.localStorage = new MockLocalStorage();

  const storage = new StorageService();
  const quotaInfo = await storage.getQuotaInfo();

  assert(typeof quotaInfo.used === 'number');
  assert(typeof quotaInfo.total === 'number');
  assert(typeof quotaInfo.available === 'number');
  assert(typeof quotaInfo.percentage === 'number');

  global.localStorage = originalLocalStorage;
});

// Batch operations tests
runner.test('Handles batch set operations', async () => {
  const originalLocalStorage = global.localStorage;
  global.localStorage = new MockLocalStorage();

  const storage = new StorageService();

  const items = {
    'item1': 'value1',
    'item2': { data: 'value2' },
    'item3': [1, 2, 3]
  };

  const results = await storage.setMultiple(items);

  assertEqual(results.length, 3);
  assert(results.every(r => r.success), 'All items should be stored successfully');

  assertEqual(storage.getItem('item1'), 'value1');
  assertEqual(storage.getItem('item2').data, 'value2');
  assertEqual(storage.getItem('item3').length, 3);

  global.localStorage = originalLocalStorage;
});

runner.test('Handles batch get operations', () => {
  const originalLocalStorage = global.localStorage;
  global.localStorage = new MockLocalStorage();

  const storage = new StorageService();

  // Set up test data
  global.localStorage.setItem('key1', JSON.stringify('value1'));
  global.localStorage.setItem('key2', JSON.stringify({ data: 'value2' }));
  global.localStorage.setItem('key3', JSON.stringify([1, 2, 3]));

  const results = storage.getMultiple(['key1', 'key2', 'key3', 'nonexistent']);

  assertEqual(results.key1, 'value1');
  assertEqual(results.key2.data, 'value2');
  assertEqual(results.key3.length, 3);
  assertEqual(results.nonexistent, null);

  global.localStorage = originalLocalStorage;
});

// Utility function tests
runner.test('Correctly identifies existing items', async () => {
  const originalLocalStorage = global.localStorage;
  global.localStorage = new MockLocalStorage();

  const storage = new StorageService();

  await storage.setItem('existing', 'value');

  assert(storage.hasItem('existing'));
  assert(!storage.hasItem('nonexistent'));

  global.localStorage = originalLocalStorage;
});

runner.test('Returns all keys correctly', async () => {
  const originalLocalStorage = global.localStorage;
  global.localStorage = new MockLocalStorage();

  const storage = new StorageService();

  await storage.setItem('key1', 'value1');
  await storage.setItem('key2', 'value2');
  await storage.setItem('key3', 'value3');

  const keys = storage.getAllKeys();
  assertEqual(keys.length, 3);
  assert(keys.includes('key1'));
  assert(keys.includes('key2'));
  assert(keys.includes('key3'));

  global.localStorage = originalLocalStorage;
});

runner.test('Clears all storage correctly', async () => {
  const originalLocalStorage = global.localStorage;
  global.localStorage = new MockLocalStorage();

  const storage = new StorageService();

  await storage.setItem('key1', 'value1');
  await storage.setItem('key2', 'value2');

  assertEqual(storage.getAllKeys().length, 2);

  storage.clear();
  assertEqual(storage.getAllKeys().length, 0);

  global.localStorage = originalLocalStorage;
});

runner.test('Provides storage statistics', async () => {
  const originalLocalStorage = global.localStorage;
  global.localStorage = new MockLocalStorage();

  const storage = new StorageService();

  await storage.setItem('key1', 'value1');
  await storage.setItem('key2', 'value2');

  const stats = await storage.getStats();

  assert(typeof stats.isAvailable === 'boolean');
  assertEqual(stats.itemCount, 2);
  assert(typeof stats.quota === 'object');
  assert(Array.isArray(stats.keys));
  assertEqual(stats.keys.length, 2);

  global.localStorage = originalLocalStorage;
});

// Default value tests
runner.test('Returns default values for missing items', () => {
  const originalLocalStorage = global.localStorage;
  global.localStorage = new MockLocalStorage();

  const storage = new StorageService();

  assertEqual(storage.getItem('nonexistent'), null);
  assertEqual(storage.getItem('nonexistent', 'default'), 'default');
  assertEqual(storage.getItem('nonexistent', { default: true }).default, true);

  global.localStorage = originalLocalStorage;
});

// Run the tests
if (typeof window === 'undefined') {
  // Node.js environment
  global.localStorage = new MockLocalStorage();
  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  });
} else {
  // Browser environment
  runner.run();
}

export { runner as storageTestRunner };