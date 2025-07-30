/**
 * App Tests Index
 * Exports all application-level tests
 */

export * from './models.test.js';
export * from './todo-input.test.js';
export * from './todo-item.test.js';

// Test runner for app tests
export const runAppTests = async () => {
  console.log('Running App Tests...');

  // Import and run model tests
  const { runTests } = await import('./models.test.js');
  await runTests();

  // Import and run TodoInput component tests
  const { runTodoInputTests } = await import('./todo-input.test.js');
  runTodoInputTests();

  // Import and run TodoItem component tests
  const { runTodoItemTests } = await import('./todo-item.test.js');
  runTodoItemTests();

  console.log('App Tests completed.');
};