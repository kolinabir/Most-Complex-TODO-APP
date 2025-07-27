/**
 * Framework Tests Entry Point
 *
 * This module exports test functions that can be called by the main test runner
 */

import { TodoLangStateManager } from '../../src/framework/state/index.js';

/**
 * Run state management tests for integration with main test runner
 */
export function runStateManagementTests() {
  const results = { passed: 0, failed: 0, total: 0 };

  console.log('🏗️  Running State Management Tests...');

  // Test 1: Basic state creation
  try {
    const stateManager = new TodoLangStateManager();
    const state = stateManager.createState({ count: 0 });

    if (state.count === 0) {
      console.log('  ✅ State creation works');
      results.passed++;
    } else {
      console.log('  ❌ State creation failed');
      results.failed++;
    }
  } catch (error) {
    console.log(`  ❌ State creation error: ${error.message}`);
    results.failed++;
  }
  results.total++;

  // Test 2: State reactivity
  try {
    const stateManager = new TodoLangStateManager();
    const state = stateManager.createState({ value: 1 });
    let changeDetected = false;

    stateManager.subscribe((changes) => {
      if (changes.length > 0 && changes[0].path === 'value') {
        changeDetected = true;
      }
    });

    state.value = 2;

    // Wait for async notification
    setTimeout(() => {
      if (changeDetected) {
        console.log('  ✅ State reactivity works');
        results.passed++;
      } else {
        console.log('  ❌ State reactivity failed');
        results.failed++;
      }
      results.total++;
    }, 20);

  } catch (error) {
    console.log(`  ❌ State reactivity error: ${error.message}`);
    results.failed++;
    results.total++;
  }

  // Test 3: Todo application state structure
  try {
    const stateManager = new TodoLangStateManager();
    const todoState = stateManager.createState({
      todos: [],
      filter: 'all',
      editingId: null
    }, 'todoApp');

    // Test adding a todo
    todoState.todos.push({
      id: '1',
      text: 'Test todo',
      completed: false
    });

    if (todoState.todos.length === 1 && todoState.todos[0].text === 'Test todo') {
      console.log('  ✅ Todo state structure works');
      results.passed++;
    } else {
      console.log('  ❌ Todo state structure failed');
      results.failed++;
    }
  } catch (error) {
    console.log(`  ❌ Todo state structure error: ${error.message}`);
    results.failed++;
  }
  results.total++;

  // Test 4: State updates using updateState method
  try {
    const stateManager = new TodoLangStateManager();
    const state = stateManager.createState({ count: 0 }, 'test');

    stateManager.updateState('count', 5);

    if (state.count === 5) {
      console.log('  ✅ State updates work');
      results.passed++;
    } else {
      console.log('  ❌ State updates failed');
      results.failed++;
    }
  } catch (error) {
    console.log(`  ❌ State updates error: ${error.message}`);
    results.failed++;
  }
  results.total++;

  // Test 5: Debug information
  try {
    const stateManager = new TodoLangStateManager();
    const state = stateManager.createState({ test: true }, 'debug-test');
    stateManager.subscribe(() => {}, 'test');

    const debugInfo = stateManager.getDebugInfo();

    if (debugInfo.stateCount === 1 && debugInfo.subscriberCount === 1) {
      console.log('  ✅ Debug information works');
      results.passed++;
    } else {
      console.log('  ❌ Debug information failed');
      results.failed++;
    }
  } catch (error) {
    console.log(`  ❌ Debug information error: ${error.message}`);
    results.failed++;
  }
  results.total++;

  return results;
}

/**
 * Run all framework tests
 */
export function runFrameworkTests() {
  console.log('\n🏗️  Running Framework Tests...');

  const stateResults = runStateManagementTests();

  // Placeholder for other framework components
  console.log('  ⏭️  Virtual DOM not yet implemented - skipping test');
  console.log('  ⏭️  Router not yet implemented - skipping test');
  console.log('  ⏭️  Storage not yet implemented - skipping test');

  return {
    passed: stateResults.passed,
    failed: stateResults.failed,
    total: stateResults.total + 3, // +3 for skipped tests
    skipped: 3
  };
}