/**
 * Storage Service Demo
 * Demonstrates how to use the custom storage abstraction layer
 */

import { StorageService, StorageError } from './index.js';

// Create a storage service instance
const storage = new StorageService();

async function demonstrateStorageFeatures() {
  console.log('=== Storage Service Demo ===\n');

  try {
    // 1. Basic storage operations
    console.log('1. Basic Storage Operations:');
    await storage.setItem('user_name', 'John Doe');
    await storage.setItem('user_age', 30);
    await storage.setItem('user_preferences', {
      theme: 'dark',
      notifications: true,
      language: 'en'
    });

    console.log('Stored user data:');
    console.log('- Name:', storage.getItem('user_name'));
    console.log('- Age:', storage.getItem('user_age'));
    console.log('- Preferences:', storage.getItem('user_preferences'));
    console.log();

    // 2. Complex data structures
    console.log('2. Complex Data Structures:');
    const todoList = [
      { id: 1, text: 'Learn TodoLang', completed: false, tags: ['programming', 'learning'] },
      { id: 2, text: 'Build todo app', completed: true, tags: ['project', 'programming'] },
      { id: 3, text: 'Write documentation', completed: false, tags: ['documentation'] }
    ];

    await storage.setItem('todos', todoList);
    const retrievedTodos = storage.getItem('todos');
    console.log('Stored and retrieved todos:', retrievedTodos.length, 'items');
    console.log('First todo:', retrievedTodos[0]);
    console.log();

    // 3. Default values
    console.log('3. Default Values:');
    console.log('Non-existent key (null):', storage.getItem('non_existent'));
    console.log('Non-existent key (default):', storage.getItem('non_existent', 'default_value'));
    console.log('Non-existent key (object):', storage.getItem('non_existent', { default: true }));
    console.log();

    // 4. Batch operations
    console.log('4. Batch Operations:');
    const batchData = {
      'setting_1': 'value1',
      'setting_2': { nested: 'value2' },
      'setting_3': [1, 2, 3, 4, 5]
    };

    const batchResults = await storage.setMultiple(batchData);
    console.log('Batch set results:', batchResults);

    const batchRetrieved = storage.getMultiple(['setting_1', 'setting_2', 'setting_3', 'missing']);
    console.log('Batch get results:', batchRetrieved);
    console.log();

    // 5. Storage statistics
    console.log('5. Storage Statistics:');
    const stats = await storage.getStats();
    console.log('Storage available:', stats.isAvailable);
    console.log('Item count:', stats.itemCount);
    console.log('Storage quota used:', Math.round(stats.quota.percentage * 100) + '%');
    console.log('All keys:', stats.keys);
    console.log();

    // 6. Key management
    console.log('6. Key Management:');
    console.log('Has user_name:', storage.hasItem('user_name'));
    console.log('Has missing_key:', storage.hasItem('missing_key'));
    console.log('All keys count:', storage.getAllKeys().length);
    console.log();

    // 7. Error handling demonstration
    console.log('7. Error Handling:');
    try {
      await storage.setItem('', 'invalid key');
    } catch (error) {
      console.log('Caught expected error for empty key:', error.message);
    }

    try {
      // Create circular reference
      const circular = { name: 'test' };
      circular.self = circular;
      await storage.setItem('circular', circular);
    } catch (error) {
      console.log('Caught expected serialization error:', error.message);
    }
    console.log();

    // 8. Cleanup demonstration
    console.log('8. Cleanup:');
    console.log('Items before cleanup:', storage.getAllKeys().length);

    // Add some temporary items
    await storage.setItem('temp_item1', 'temporary data');
    await storage.setItem('cache_item2', 'cached data');
    console.log('Items after adding temp items:', storage.getAllKeys().length);

    // Simulate cleanup (this would normally happen automatically during quota exceeded scenarios)
    await storage._performCleanup();
    console.log('Items after cleanup:', storage.getAllKeys().length);
    console.log();

    // 9. Final cleanup
    console.log('9. Final Cleanup:');
    storage.clear();
    console.log('Items after clear:', storage.getAllKeys().length);

  } catch (error) {
    console.error('Demo error:', error);
  }
}

// Run the demo if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  demonstrateStorageFeatures();
} else {
  // Browser environment
  window.demonstrateStorageFeatures = demonstrateStorageFeatures;
  console.log('Storage demo loaded. Call demonstrateStorageFeatures() to run.');
}

export { demonstrateStorageFeatures };