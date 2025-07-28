/**
 * App Tests Index
 * Exports all application-level tests
 */

export * from './models.test.js';

// Test runner for app tests
export const runAppTests = async () => {
  console.log('Running App Tests...');

  // Import and run model tests
  const { runTests } = await import('./models.test.js');
  await runTests();

  console.log('App Tests completed.');
};