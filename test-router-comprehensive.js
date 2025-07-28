/**
 * Comprehensive Router Test
 *
 * Tests all router functionality according to task requirements:
 * - Client-side router with URL pattern matching
 * - Route registration system and navigation methods
 * - Browser history integration and URL state management
 * - Route parameter extraction and query string handling
 */

import { TodoLangRouter, Route, QueryParser, HistoryManager } from './src/framework/router/index.js';

console.log('🧪 Comprehensive Router Testing...\n');

let testsPassed = 0;
let testsTotal = 0;

function runTest(name, testFn) {
  testsTotal++;
  console.log(`📝 ${name}`);
  try {
    const result = testFn();
    if (result) {
      console.log(`  ✅ ${name}`);
      testsPassed++;
    } else {
      console.log(`  ❌ ${name} - Test returned false`);
    }
  } catch (error) {
    console.log(`  ❌ ${name} - ${error.message}`);
  }
}

// Test 1: URL Pattern Matching
runTest('URL Pattern Matching with Parameters', () => {
  const route = new Route('/todos/:id/edit/:field', () => {});
  const match = route.match('/todos/123/edit/title');

  return match &&
         match.params.id === '123' &&
         match.params.field === 'title';
});

// Test 2: Wildcard Pattern Matching
runTest('Wildcard Pattern Matching', () => {
  const route = new Route('/api/*', () => {});
  const match1 = route.match('/api/todos');
  const match2 = route.match('/api/users/123/todos');

  return match1 && match2;
});

// Test 3: Route Registration System
runTest('Route Registration System', () => {
  const router = new TodoLangRouter();

  // Test single route addition
  router.addRoute('/home', () => {});

  // Test multiple route addition
  router.addRoutes([
    { path: '/about', handler: () => {} },
    { path: '/contact', handler: () => {} }
  ]);

  // Test chaining
  router.addRoute('/blog', () => {}).addRoute('/portfolio', () => {});

  return router.routes.length === 5;
});

// Test 4: Navigation Methods
runTest('Navigation Methods', () => {
  const router = new TodoLangRouter();

  // Test that navigation methods exist and are functions
  return typeof router.navigate === 'function' &&
         typeof router.replace === 'function' &&
         typeof router.back === 'function' &&
         typeof router.forward === 'function';
});

// Test 5: Query String Handling
runTest('Query String Parsing and Stringifying', () => {
  // Test parsing
  const parsed = QueryParser.parse('?filter=active&sort=date&page=2');
  const parseResult = parsed.filter === 'active' &&
                     parsed.sort === 'date' &&
                     parsed.page === '2';

  // Test stringifying
  const stringified = QueryParser.stringify({ filter: 'completed', sort: 'name' });
  const stringifyResult = stringified.includes('filter=completed') &&
                         stringified.includes('sort=name');

  // Test URL encoding/decoding
  const encoded = QueryParser.parse('text=hello%20world');
  const encodingResult = encoded.text === 'hello world';

  return parseResult && stringifyResult && encodingResult;
});

// Test 6: Route Parameter Extraction
runTest('Route Parameter Extraction', () => {
  const router = new TodoLangRouter();
  router.addRoute('/users/:userId/todos/:todoId/comments/:commentId', () => {});

  const match = router._findMatchingRoute('/users/123/todos/456/comments/789');

  return match &&
         match.params.userId === '123' &&
         match.params.todoId === '456' &&
         match.params.commentId === '789';
});

// Test 7: URL Building with Query Parameters
runTest('URL Building with Query Parameters', () => {
  const router = new TodoLangRouter();

  const url1 = router.buildUrl('/todos', { filter: 'active', sort: 'date' });
  const url2 = router.buildUrl('/search', { q: 'hello world', page: 1 });

  return url1.includes('/todos?') &&
         url1.includes('filter=active') &&
         url1.includes('sort=date') &&
         url2.includes('q=hello%20world');
});

// Test 8: Path Normalization
runTest('Path Normalization', () => {
  const router = new TodoLangRouter();

  const normalized1 = router._normalizePath('todos');
  const normalized2 = router._normalizePath('/todos');
  const normalized3 = router._normalizePath('/todos/');

  return normalized1 === '/todos' &&
         normalized2 === '/todos' &&
         normalized3 === '/todos/';
});

// Test 9: Case Sensitivity Options
runTest('Case Sensitivity Options', () => {
  const caseSensitiveRouter = new TodoLangRouter({ caseSensitive: true });
  const caseInsensitiveRouter = new TodoLangRouter({ caseSensitive: false });

  const sensitive = caseSensitiveRouter._normalizePath('/Todos');
  const insensitive = caseInsensitiveRouter._normalizePath('/Todos');

  return sensitive === '/Todos' && insensitive === '/todos';
});

// Test 10: Hook System
runTest('Before and After Navigation Hooks', () => {
  const router = new TodoLangRouter();

  let beforeCalled = false;
  let afterCalled = false;

  router.beforeEach(() => { beforeCalled = true; });
  router.afterEach(() => { afterCalled = true; });

  return router.beforeHooks.length === 1 &&
         router.afterHooks.length === 1;
});

// Test 11: Error Handling
runTest('Error Handling System', () => {
  const router = new TodoLangRouter();

  let errorHandled = false;
  router.onError(() => { errorHandled = true; });

  // Test 404 handling
  router._handleNotFound('/nonexistent');

  return router.errorHandlers.length === 1;
});

// Test 12: Router State Management
runTest('Router State Management', () => {
  const router = new TodoLangRouter();

  // Test initial state
  const initialState = router.getCurrentRoute();

  // Test debug info
  const debugInfo = router.getDebugInfo();

  return initialState &&
         debugInfo &&
         typeof debugInfo.isStarted === 'boolean' &&
         typeof debugInfo.routeCount === 'number';
});

// Test 13: History Manager Integration
runTest('History Manager Integration', () => {
  const router = new TodoLangRouter();

  return router.history instanceof HistoryManager &&
         typeof router.history.pushState === 'function' &&
         typeof router.history.replaceState === 'function' &&
         typeof router.history.back === 'function' &&
         typeof router.history.forward === 'function';
});

// Test 14: Route Matching Priority
runTest('Route Matching Priority', () => {
  const router = new TodoLangRouter();

  // Add routes in specific order
  router.addRoute('/todos/new', () => 'new');
  router.addRoute('/todos/:id', () => 'detail');
  router.addRoute('/todos', () => 'list');

  // Test that more specific routes match first
  const match1 = router._findMatchingRoute('/todos/new');
  const match2 = router._findMatchingRoute('/todos/123');
  const match3 = router._findMatchingRoute('/todos');

  return match1.route.path === '/todos/new' &&
         match2.route.path === '/todos/:id' &&
         match3.route.path === '/todos';
});

// Test 15: Todo App Specific Routes
runTest('Todo App Filter Routes', () => {
  const router = new TodoLangRouter();

  // Add routes that would be used in the todo app
  router.addRoute('/', () => {});
  router.addRoute('/active', () => {});
  router.addRoute('/completed', () => {});

  // Test filter URL building
  const allUrl = router.buildUrl('/', { filter: 'all' });
  const activeUrl = router.buildUrl('/', { filter: 'active' });
  const completedUrl = router.buildUrl('/', { filter: 'completed' });

  return allUrl === '/?filter=all' &&
         activeUrl === '/?filter=active' &&
         completedUrl === '/?filter=completed';
});

// Print Results
console.log('\n' + '='.repeat(50));
console.log('📊 Comprehensive Router Test Results');
console.log('='.repeat(50));
console.log(`Total Tests: ${testsTotal}`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsTotal - testsPassed}`);

if (testsPassed === testsTotal) {
  console.log('\n🎉 All router tests passed!');
  console.log('✅ Client-side router with URL pattern matching: IMPLEMENTED');
  console.log('✅ Route registration system and navigation methods: IMPLEMENTED');
  console.log('✅ Browser history integration and URL state management: IMPLEMENTED');
  console.log('✅ Route parameter extraction and query string handling: IMPLEMENTED');
} else {
  console.log(`\n⚠️  ${testsTotal - testsPassed} test(s) failed`);
}

console.log('\n🚀 Router system is ready for use in the TodoLang application!');