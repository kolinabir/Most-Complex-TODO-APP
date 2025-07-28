/**
 * Router System Tests
 *
 * Tests for the custom client-side routing system including:
 * - Route registration and matching
 * - URL pattern matching with parameters
 * - Query string parsing and handling
 * - Browser history integration
 * - Navigation methods
 */

import { TodoLangRouter, Route, QueryParser, HistoryManager } from '../../src/framework/router/index.js';

// Create mock functions for window.history
const mockPushState = jest.fn();
const mockReplaceState = jest.fn();
const mockBack = jest.fn();
const mockForward = jest.fn();
const mockGo = jest.fn();
const mockLocationReplace = jest.fn();

// Enhance window mock for router testing
global.window.history = {
  pushState: mockPushState,
  replaceState: mockReplaceState,
  back: mockBack,
  forward: mockForward,
  go: mockGo
};

global.window.location = {
  pathname: '/',
  search: '',
  hash: '',
  replace: mockLocationReplace
};

describe('Route Class', () => {
  test('should create route with basic path', () => {
    const handler = jest.fn();
    const route = new Route('/todos', handler);

    expect(route.path).toBe('/todos');
    expect(route.handler).toBe(handler);
    expect(route.paramNames).toEqual([]);
  });

  test('should match exact paths', () => {
    const route = new Route('/todos', jest.fn());

    const match = route.match('/todos');
    expect(match).toBeTruthy();
    expect(match.path).toBe('/todos');
    expect(match.params).toEqual({});
  });

  test('should not match different paths', () => {
    const route = new Route('/todos', jest.fn());

    const match = route.match('/users');
    expect(match).toBeNull();
  });

  test('should extract route parameters', () => {
    const route = new Route('/todos/:id', jest.fn());

    const match = route.match('/todos/123');
    expect(match).toBeTruthy();
    expect(match.params.id).toBe('123');
  });

  test('should extract multiple parameters', () => {
    const route = new Route('/users/:userId/todos/:todoId', jest.fn());

    const match = route.match('/users/456/todos/789');
    expect(match).toBeTruthy();
    expect(match.params.userId).toBe('456');
    expect(match.params.todoId).toBe('789');
  });

  test('should handle wildcard routes', () => {
    const route = new Route('/api/*', jest.fn());

    const match1 = route.match('/api/todos');
    const match2 = route.match('/api/users/123');

    expect(match1).toBeTruthy();
    expect(match2).toBeTruthy();
  });
});

describe('QueryParser', () => {
  test('should parse basic query string', () => {
    const params = QueryParser.parse('?filter=active&sort=date');

    expect(params.filter).toBe('active');
    expect(params.sort).toBe('date');
  });

  test('should parse query string without leading ?', () => {
    const params = QueryParser.parse('filter=completed');

    expect(params.filter).toBe('completed');
  });

  test('should return empty object for empty query', () => {
    const params = QueryParser.parse('');

    expect(Object.keys(params)).toHaveLength(0);
  });

  test('should handle URL decoding', () => {
    const params = QueryParser.parse('text=hello%20world');

    expect(params.text).toBe('hello world');
  });

  test('should stringify parameters to query string', () => {
    const query = QueryParser.stringify({ filter: 'active', sort: 'date' });

    expect(query).toContain('filter=active');
    expect(query).toContain('sort=date');
  });

  test('should handle URL encoding in stringify', () => {
    const query = QueryParser.stringify({ text: 'hello world' });

    expect(query).toContain('hello%20world');
  });

  test('should filter out null and undefined values', () => {
    const query = QueryParser.stringify({ a: null, b: undefined, c: 'value' });

    expect(query).not.toContain('a=');
    expect(query).not.toContain('b=');
    expect(query).toContain('c=value');
  });

  test('should return empty string for empty object', () => {
    const query = QueryParser.stringify({});

    expect(query).toBe('');
  });
});

describe('TodoLangRouter', () => {
  let router;

  beforeEach(() => {
    router = new TodoLangRouter();
    // Reset window mocks
    mockPushState.mock.calls = [];
    mockReplaceState.mock.calls = [];
  });

  test('should initialize with default options', () => {
    expect(router.options.useHash).toBe(false);
    expect(router.options.base).toBe('');
    expect(router.options.caseSensitive).toBe(false);
    expect(router._isStarted).toBe(false);
  });

  test('should add single route', () => {
    const handler = jest.fn();
    router.addRoute('/todos', handler);

    expect(router.routes).toHaveLength(1);
    expect(router.routes[0].path).toBe('/todos');
    expect(router.routes[0].handler).toBe(handler);
  });

  test('should add multiple routes', () => {
    const routes = [
      { path: '/users', handler: jest.fn() },
      { path: '/settings', handler: jest.fn() }
    ];

    router.addRoutes(routes);

    expect(router.routes).toHaveLength(2);
  });

  test('should chain route additions', () => {
    const result = router.addRoute('/', jest.fn()).addRoute('/todos', jest.fn());

    expect(result).toBe(router);
    expect(router.routes).toHaveLength(2);
  });

  test('should normalize paths correctly', () => {
    const normalized1 = router._normalizePath('/todos');
    const normalized2 = router._normalizePath('todos');

    expect(normalized1).toBe('/todos');
    expect(normalized2).toBe('/todos');
  });

  test('should build URLs with query parameters', () => {
    const url = router.buildUrl('/todos', { filter: 'active', sort: 'date' });

    expect(url).toContain('/todos?');
    expect(url).toContain('filter=active');
    expect(url).toContain('sort=date');
  });

  test('should find matching routes', () => {
    router.addRoute('/todos', jest.fn());
    router.addRoute('/todos/:id', jest.fn());

    const match1 = router._findMatchingRoute('/todos');
    const match2 = router._findMatchingRoute('/todos/123');

    expect(match1).toBeTruthy();
    expect(match1.route.path).toBe('/todos');

    expect(match2).toBeTruthy();
    expect(match2.route.path).toBe('/todos/:id');
    expect(match2.params.id).toBe('123');
  });

  test('should return null for non-matching routes', () => {
    router.addRoute('/todos', jest.fn());

    const match = router._findMatchingRoute('/users');

    expect(match).toBeNull();
  });

  test('should handle navigation', () => {
    router.navigate('/todos');

    expect(mockPushState).toHaveBeenCalled();
  });

  test('should handle replace navigation', () => {
    router.replace('/todos');

    expect(mockReplaceState).toHaveBeenCalled();
  });

  test('should add before hooks', () => {
    const hook = jest.fn();
    router.beforeEach(hook);

    expect(router.beforeHooks).toContain(hook);
  });

  test('should add after hooks', () => {
    const hook = jest.fn();
    router.afterEach(hook);

    expect(router.afterHooks).toContain(hook);
  });

  test('should add error handlers', () => {
    const handler = jest.fn();
    router.onError(handler);

    expect(router.errorHandlers).toContain(handler);
  });

  test('should get current route info', () => {
    router.currentRoute = { path: '/todos' };
    router.currentParams = { id: '123' };
    router.currentQuery = { filter: 'active' };

    const current = router.getCurrentRoute();

    expect(current.route).toBe(router.currentRoute);
    expect(current.params).toEqual({ id: '123' });
    expect(current.query).toEqual({ filter: 'active' });
  });

  test('should provide debug information', () => {
    router.addRoute('/test', jest.fn());

    const debug = router.getDebugInfo();

    expect(debug.isStarted).toBe(false);
    expect(debug.routeCount).toBe(1);
    expect(debug.options).toBeTruthy();
  });
});

describe('Router Integration', () => {
  let router;

  beforeEach(() => {
    router = new TodoLangRouter();
  });

  test('should handle todo app filter routes', () => {
    let currentFilter = 'all';

    // Add routes that match todo app requirements
    router.addRoute('/', (to) => {
      currentFilter = to.query.filter || 'all';
    });

    router.addRoute('/active', () => {
      currentFilter = 'active';
    });

    router.addRoute('/completed', () => {
      currentFilter = 'completed';
    });

    expect(router.routes).toHaveLength(3);
  });

  test('should extract filter from query parameters', () => {
    const params = QueryParser.parse('?filter=active');

    expect(params.filter).toBe('active');
  });

  test('should build filter URLs correctly', () => {
    const activeUrl = router.buildUrl('/', { filter: 'active' });
    const completedUrl = router.buildUrl('/', { filter: 'completed' });

    expect(activeUrl).toBe('/?filter=active');
    expect(completedUrl).toBe('/?filter=completed');
  });

  test('should handle route parameter extraction for todo IDs', () => {
    const route = new Route('/todos/:id/edit', jest.fn());

    const match = route.match('/todos/abc123/edit');

    expect(match).toBeTruthy();
    expect(match.params.id).toBe('abc123');
  });
});

describe('Router Performance', () => {
  test('should handle many routes efficiently', () => {
    const router = new TodoLangRouter();

    // Add many routes
    for (let i = 0; i < 100; i++) {
      router.addRoute(`/route${i}`, jest.fn());
      router.addRoute(`/route${i}/:id`, jest.fn());
    }

    const startTime = performance.now();

    // Test route matching performance
    for (let i = 0; i < 10; i++) {
      router._findMatchingRoute('/route50/123');
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should be very fast (less than 50ms for this simple test)
    expect(duration).toBeLessThan(50);
  });
});

describe('Error Handling', () => {
  let router;

  beforeEach(() => {
    router = new TodoLangRouter();
  });

  test('should handle route not found', () => {
    const errorHandler = jest.fn();
    router.onError(errorHandler);

    router._handleNotFound('/nonexistent');

    expect(errorHandler).toHaveBeenCalled();
    const [error] = errorHandler.mock.calls[0];
    expect(error.code).toBe('ROUTE_NOT_FOUND');
    expect(error.path).toBe('/nonexistent');
  });

  test('should handle errors in route handlers', () => {
    const errorHandler = jest.fn();
    router.onError(errorHandler);

    const error = new Error('Test error');
    router._handleError(error, '/test');

    expect(errorHandler).toHaveBeenCalledWith(error, '/test');
  });
});