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
 * Run virtual DOM tests
 */
async function runVirtualDOMTests() {
  const results = { passed: 0, failed: 0, total: 0 };

  console.log('🎭 Running Virtual DOM Tests...');

  // Test 1: Virtual DOM creation
  try {
    const { createElement, createTextNode } = await import('../../src/framework/components/virtual-dom.js');

    const textNode = createTextNode('Hello');
    const elementNode = createElement('div', { id: 'test' }, textNode);

    if (elementNode.type === 'div' && elementNode.props.id === 'test' && elementNode.children.length === 1) {
      console.log('  ✅ Virtual DOM creation works');
      results.passed++;
    } else {
      console.log('  ❌ Virtual DOM creation failed');
      results.failed++;
    }
  } catch (error) {
    console.log(`  ❌ Virtual DOM creation error: ${error.message}`);
    results.failed++;
  }
  results.total++;

  // Test 2: Virtual DOM diffing
  try {
    const { createElement, VirtualDOMDiffer, PatchType } = await import('../../src/framework/components/virtual-dom.js');

    const differ = new VirtualDOMDiffer();
    const oldVNode = createElement('div', { id: 'old' });
    const newVNode = createElement('div', { id: 'new' });

    const patches = differ.diff(oldVNode, newVNode);

    if (patches.length > 0 && patches[0].type === PatchType.UPDATE) {
      console.log('  ✅ Virtual DOM diffing works');
      results.passed++;
    } else {
      console.log('  ❌ Virtual DOM diffing failed');
      results.failed++;
    }
  } catch (error) {
    console.log(`  ❌ Virtual DOM diffing error: ${error.message}`);
    results.failed++;
  }
  results.total++;

  // Test 3: Virtual DOM rendering
  try {
    const { createElement, VirtualDOMRenderer } = await import('../../src/framework/components/virtual-dom.js');

    // Mock document for Node.js environment
    global.document = {
      createElement: (tagName) => ({
        tagName: tagName.toLowerCase(),
        children: [],
        childNodes: [],
        attributes: {},
        style: {},
        className: '',
        textContent: '',
        parentNode: null,
        appendChild: function(child) {
          this.children.push(child);
          this.childNodes.push(child);
          child.parentNode = this;
        },
        setAttribute: function(name, value) { this.attributes[name] = value; },
        removeAttribute: function(name) { delete this.attributes[name]; },
        addEventListener: function() {},
        removeEventListener: function() {}
      }),
      createTextNode: (text) => ({
        nodeType: 3,
        textContent: text,
        parentNode: null
      }),
      createDocumentFragment: () => ({
        children: [],
        childNodes: [],
        appendChild: function(child) { this.children.push(child); }
      })
    };

    const renderer = new VirtualDOMRenderer();
    const vnode = createElement('div', { id: 'test' }, 'Hello World');

    // Mock container
    const container = {
      children: [],
      childNodes: [],
      appendChild: function(child) {
        this.children.push(child);
        this.childNodes.push(child);
      }
    };

    renderer.render(vnode, container);

    if (renderer.currentVTree && renderer.currentVTree.type === 'div') {
      console.log('  ✅ Virtual DOM rendering works');
      results.passed++;
    } else {
      console.log('  ❌ Virtual DOM rendering failed');
      results.failed++;
    }
  } catch (error) {
    console.log(`  ❌ Virtual DOM rendering error: ${error.message}`);
    results.failed++;
  }
  results.total++;

  return results;
}

/**
 * Run all framework tests
 */
export async function runFrameworkTests() {
  console.log('\n🏗️  Running Framework Tests...');

  const stateResults = runStateManagementTests();
  const virtualDOMResults = await runVirtualDOMTests();

  // Placeholder for other framework components
  console.log('  ⏭️  Router not yet implemented - skipping test');
  console.log('  ⏭️  Storage not yet implemented - skipping test');

  return {
    passed: stateResults.passed + virtualDOMResults.passed,
    failed: stateResults.failed + virtualDOMResults.failed,
    total: stateResults.total + virtualDOMResults.total + 2, // +2 for skipped tests
    skipped: 2
  };
}