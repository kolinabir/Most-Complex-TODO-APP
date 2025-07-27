/**
 * Example usage of the TodoLang State Management System
 *
 * This demonstrates how the reactive state system would be used
 * in a TodoLang application for managing todo state.
 */

import { TodoLangStateManager } from './index.js';

// Create a state manager instance
const stateManager = new TodoLangStateManager();

// Example 1: Basic Todo Application State
console.log('=== Example 1: Basic Todo Application State ===');

const todoAppState = stateManager.createState({
  todos: [],
  filter: 'all',
  editingId: null,
  newTodoText: ''
}, 'todoApp');

// Subscribe to all state changes
stateManager.subscribe((changes) => {
  console.log('State changes detected:', changes.map(c => ({
    path: c.path,
    newValue: c.newValue,
    oldValue: c.oldValue
  })));
});

// Subscribe to specific todo changes
stateManager.subscribe((change) => {
  console.log(`Todos updated: ${change.path} = ${JSON.stringify(change.newValue)}`);
}, 'todos');

// Simulate adding todos
console.log('\n--- Adding todos ---');
todoAppState.todos.push({
  id: '1',
  text: 'Learn TodoLang',
  completed: false,
  createdAt: new Date()
});

todoAppState.todos.push({
  id: '2',
  text: 'Build todo app',
  completed: false,
  createdAt: new Date()
});

// Simulate completing a todo
console.log('\n--- Completing a todo ---');
todoAppState.todos[0].completed = true;

// Simulate changing filter
console.log('\n--- Changing filter ---');
todoAppState.filter = 'completed';

// Example 2: Computed Properties Pattern
console.log('\n=== Example 2: Computed Properties Pattern ===');

// Function that acts like a computed property
function getFilteredTodos() {
  return todoAppState.todos.filter(todo => {
    if (todoAppState.filter === 'active') return !todo.completed;
    if (todoAppState.filter === 'completed') return todo.completed;
    return true;
  });
}

console.log('Filtered todos (completed):', getFilteredTodos());

todoAppState.filter = 'active';
console.log('Filtered todos (active):', getFilteredTodos());

todoAppState.filter = 'all';
console.log('Filtered todos (all):', getFilteredTodos());

// Example 3: Component-like State Management
console.log('\n=== Example 3: Component-like State Management ===');

// Simulate a component that tracks its dependencies
stateManager.startTracking('TodoList');

// Access state properties (this would be tracked)
const currentTodos = todoAppState.todos;
const currentFilter = todoAppState.filter;

stateManager.stopTracking();

console.log('TodoList component dependencies tracked');

// Example 4: State Updates via updateState method
console.log('\n=== Example 4: State Updates via updateState ===');

stateManager.updateState('newTodoText', 'New todo from updateState');
console.log('New todo text:', todoAppState.newTodoText);

stateManager.updateState('todos.0.text', 'Updated todo text');
console.log('Updated first todo:', todoAppState.todos[0]);

// Example 5: Debug Information
console.log('\n=== Example 5: Debug Information ===');

const debugInfo = stateManager.getDebugInfo();
console.log('State Manager Debug Info:', debugInfo);

// Example 6: Unsubscribing
console.log('\n=== Example 6: Unsubscribing ===');

const unsubscribe = stateManager.subscribe((changes) => {
  console.log('This subscription will be removed');
});

// Make a change
todoAppState.newTodoText = 'Test';

// Unsubscribe
unsubscribe();

// This change won't trigger the unsubscribed callback
todoAppState.newTodoText = 'Test 2';

console.log('\n=== State Management Example Complete ===');