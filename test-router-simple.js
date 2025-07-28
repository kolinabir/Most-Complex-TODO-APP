/**
 * Simple Router Test
 *
 * Basic test to verify the router implementation is working
 */

import { TodoLangRouter, Route, QueryParser, HistoryManager } from './src/framework/router/index.js';

console.log('🧪 Testing Router Implementation...\n');

// Test 1: Route Creation and Matching
console.log('📝 Test 1: Route Creation and Matching');
try {
  const route = new Route('/todos/:id', () => {});
  const match = route.match('/todos/123');

  if (match && match.params.id === '123') {
    console.log('  ✅ Route parameter extraction works');
  } else {
    console.log('  ❌ Route parameter extraction failed');
  }
} catch (error) {
  console.log('  ❌ Route creation failed:', error.message);
}

// Test 2: Query Parser
console.log('\n📝 Test 2: Query String Parsing');
try {
  const params = QueryParser.parse('?filter=active&sort=date');

  if (params.filter === 'active' && params.sort === 'date') {
    console.log('  ✅ Query string parsing works');
  } else {
    console.log('  ❌ Query string parsing failed');
  }
} catch (error) {
  console.log('  ❌ Query parsing failed:', error.message);
}

// Test 3: Router Creation
console.log('\n📝 Test 3: Router Creation');
try {
  const router = new TodoLangRouter();
  router.addRoute('/todos', () => console.log('Todos route'));
  router.addRoute('/todos/:id', () => console.log('Todo detail route'));

  if (router.routes.length === 2) {
    console.log('  ✅ Router creation and route addition works');
  } else {
    console.log('  ❌ Router route addition failed');
  }
} catch (error) {
  console.log('  ❌ Router creation failed:', error.message);
}

// Test 4: URL Building
console.log('\n📝 Test 4: URL Building');
try {
  const router = new TodoLangRouter();
  const url = router.buildUrl('/todos', { filter: 'active' });

  if (url === '/todos?filter=active') {
    console.log('  ✅ URL building works');
  } else {
    console.log('  ❌ URL building failed, got:', url);
  }
} catch (error) {
  console.log('  ❌ URL building failed:', error.message);
}

// Test 5: Route Matching
console.log('\n📝 Test 5: Route Matching');
try {
  const router = new TodoLangRouter();
  router.addRoute('/todos', () => {});
  router.addRoute('/todos/:id', () => {});
  router.addRoute('/users/:userId/todos/:todoId', () => {});

  const match1 = router._findMatchingRoute('/todos');
  const match2 = router._findMatchingRoute('/todos/123');
  const match3 = router._findMatchingRoute('/users/456/todos/789');

  if (match1 && match2 && match3 &&
      match2.params.id === '123' &&
      match3.params.userId === '456' &&
      match3.params.todoId === '789') {
    console.log('  ✅ Route matching works');
  } else {
    console.log('  ❌ Route matching failed');
  }
} catch (error) {
  console.log('  ❌ Route matching failed:', error.message);
}

console.log('\n🎉 Router implementation test complete!');