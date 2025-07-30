/**
 * App Tests Index
 * Exports all application-level tests
 */

export * from './models.test.js';
export * from './todo-input.test.js';
export * from './todo-item.test.js';
export * from './todo-list.test.js';

// Test runner for app tests
export const runAppTests = async () => {
  console.log('Running App Tests...');

  // Import model tests (they run automatically when imported)
  console.log('📦 Running Model Tests...');
  await import('./models.test.js');

  // Import and run TodoInput component tests
  const { runTodoInputTests } = await import('./todo-input.test.js');
  runTodoInputTests();

  // Import and run TodoItem component tests
  const { runTodoItemTests } = await import('./todo-item.test.js');
  runTodoItemTests();

  // Import and run TodoList component tests
  const { runTodoListTests } = await import('./todo-list.test.js');
  runTodoListTests();

  console.log('App Tests completed.');
};