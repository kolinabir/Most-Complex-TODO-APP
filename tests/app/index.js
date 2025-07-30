/**
 * App Tests Index
 * Exports all application-level tests
 */

export * from './models.test.js';
export * from './todo-input.test.js';

// Test runner for app tests
export const runAppTests = async () => {
  console.log('Running App Tests...');

  // Import and run model tests
  const { runTests } = await import('./models.test.js');
  await runTests();

  // Import and run TodoInput component tests
  const { runTodoInputTests } = await import('./todo-input.test.js');
  runTodoInputTests();

  console.log('App Tests completed.');
};