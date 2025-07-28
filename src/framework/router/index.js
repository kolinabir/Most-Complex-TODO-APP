/**
 * Custom Client-Side Routing System
 *
 * This module provides a client-side routing system that:
 * - Handles URL pattern matching and route registration
 * - Manages browser history and URL state
 * - Extracts route parameters and query strings
 * - Integrates with the TodoLang component system
 */

/**
 * Route Configuration Object
 */
class Route {
  constructor(path, handler, options = {}) {
    this.path = path;
    this.handler = handler;
    this.options = options;
    this.paramNames = [];
    this.regex = this._pathToRegex(path);
  }

  /**
   * Convert path pattern to regex for matching
   * Supports parameters like /todos/:id and wildcards
   * @private
   */
  _pathToRegex(path) {
    // Escape special regex characters except for our route syntax
    let regexPath = path.replace(/[.+*?^${}()|[\]\\]/g, '\\$&');

    // Handle route parameters (:param)
    regexPath = regexPath.replace(/:([^/]+)/g, (match, paramName) => {
      this.paramNames.push(paramName);
      return '([^/]+)';
    });

    // Handle wildcards (*)
    regexPath = regexPath.replace(/\\\*/g, '(.*)');

    // Ensure exact match
    return new RegExp(`^${regexPath}$`);
  }

  /**
   * Test if this route matches the given path
   * @param {string} path - Path to test
   * @returns {Object|null} Match result with parameters or null
   */
  match(path) {
    const match = this.regex.exec(path);
    if (!match) return null;

    const params = {};
    this.paramNames.forEach((name, index) => {
      params[name] = match[index + 1];
    });

    return {
      route: this,
      params,
      path
    };
  }
}

/**
 * Query String Parser
 */
class QueryParser {
  /**
   * Parse query string into object
   * @param {string} queryString - Query string (with or without ?)
   * @returns {Object} Parsed query parameters
   */
  static parse(queryString) {
    const params = {};

    if (!queryString) return params;

    // Remove leading ? if present
    const cleanQuery = queryString.startsWith('?') ? queryString.slice(1) : queryString;

    if (!cleanQuery) return params;

    cleanQuery.split('&').forEach(pair => {
      const [key, value] = pair.split('=').map(decodeURIComponent);
      if (key) {
        params[key] = value || '';
      }
    });

    return params;
  }

  /**
   * Convert object to query string
   * @param {Object} params - Parameters to convert
   * @returns {string} Query string (without leading ?)
   */
  static stringify(params) {
    if (!params || typeof params !== 'object') return '';

    const pairs = [];
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    }

    return pairs.join('&');
  }
}

/**
 * Browser History Manager
 */
class HistoryManager {
  constructor(router) {
    this.router = router;
    this._isNavigating = false;
    this._setupEventListeners();
  }

  /**
   * Setup browser event listeners
   * @private
   */
  _setupEventListeners() {
    // Only setup listeners if we're in a browser environment
    if (typeof window === 'undefined') return;

    // Handle browser back/forward buttons
    window.addEventListener('popstate', (event) => {
      if (!this._isNavigating) {
        const path = window.location.pathname + window.location.search;
        this.router._handleRouteChange(path, false);
      }
    });

    // Handle hash changes (for hash-based routing fallback)
    window.addEventListener('hashchange', (event) => {
      if (this.router.options.useHash) {
        const hash = window.location.hash.slice(1) || '/';
        this.router._handleRouteChange(hash, false);
      }
    });
  }

  /**
   * Push new state to history
   * @param {string} path - Path to navigate to
   * @param {Object} state - State object to store
   */
  pushState(path, state = {}) {
    if (typeof window === 'undefined') return;

    this._isNavigating = true;

    if (this.router.options.useHash) {
      window.location.hash = path;
    } else {
      window.history.pushState(state, '', path);
    }

    this._isNavigating = false;
  }

  /**
   * Replace current state in history
   * @param {string} path - Path to replace with
   * @param {Object} state - State object to store
   */
  replaceState(path, state = {}) {
    if (typeof window === 'undefined') return;

    this._isNavigating = true;

    if (this.router.options.useHash) {
      window.location.replace(`${window.location.pathname}${window.location.search}#${path}`);
    } else {
      window.history.replaceState(state, '', path);
    }

    this._isNavigating = false;
  }

  /**
   * Go back in history
   */
  back() {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }

  /**
   * Go forward in history
   */
  forward() {
    if (typeof window !== 'undefined') {
      window.history.forward();
    }
  }

  /**
   * Go to specific history entry
   * @param {number} delta - Number of steps to go (negative for back)
   */
  go(delta) {
    if (typeof window !== 'undefined') {
      window.history.go(delta);
    }
  }
}

/**
 * Main Router Class
 */
class TodoLangRouter {
  constructor(options = {}) {
    this.options = {
      useHash: false,
      base: '',
      caseSensitive: false,
      ...options
    };

    this.routes = [];
    this.currentRoute = null;
    this.currentParams = {};
    this.currentQuery = {};
    this.beforeHooks = [];
    this.afterHooks = [];
    this.errorHandlers = [];

    this.history = new HistoryManager(this);
    this._isStarted = false;
  }

  /**
   * Add a route to the router
   * @param {string} path - Route path pattern
   * @param {Function|Object} handler - Route handler or component
   * @param {Object} options - Route options
   * @returns {TodoLangRouter} Router instance for chaining
   */
  addRoute(path, handler, options = {}) {
    const route = new Route(path, handler, options);
    this.routes.push(route);
    return this;
  }

  /**
   * Add multiple routes at once
   * @param {Array} routes - Array of route configurations
   * @returns {TodoLangRouter} Router instance for chaining
   */
  addRoutes(routes) {
    routes.forEach(({ path, handler, options }) => {
      this.addRoute(path, handler, options);
    });
    return this;
  }

  /**
   * Navigate to a specific path
   * @param {string} path - Path to navigate to
   * @param {Object} options - Navigation options
   */
  navigate(path, options = {}) {
    const {
      replace = false,
      state = {},
      trigger = true
    } = options;

    // Normalize path
    const normalizedPath = this._normalizePath(path);

    // Update browser history
    if (replace) {
      this.history.replaceState(normalizedPath, state);
    } else {
      this.history.pushState(normalizedPath, state);
    }

    // Trigger route change if requested
    if (trigger) {
      this._handleRouteChange(normalizedPath, true);
    }
  }

  /**
   * Replace current route
   * @param {string} path - Path to replace with
   * @param {Object} options - Navigation options
   */
  replace(path, options = {}) {
    this.navigate(path, { ...options, replace: true });
  }

  /**
   * Go back in history
   */
  back() {
    this.history.back();
  }

  /**
   * Go forward in history
   */
  forward() {
    this.history.forward();
  }

  /**
   * Get current route information
   * @returns {Object} Current route information
   */
  getCurrentRoute() {
    return {
      route: this.currentRoute,
      params: { ...this.currentParams },
      query: { ...this.currentQuery },
      path: this._getCurrentPath()
    };
  }

  /**
   * Get current path from browser
   * @returns {string} Current path
   * @private
   */
  _getCurrentPath() {
    if (typeof window === 'undefined') return '/';

    if (this.options.useHash) {
      return window.location.hash.slice(1) || '/';
    } else {
      return window.location.pathname + window.location.search;
    }
  }

  /**
   * Start the router
   * @param {string} initialPath - Initial path to navigate to
   */
  start(initialPath = null) {
    if (this._isStarted) {
      console.warn('Router is already started');
      return;
    }

    this._isStarted = true;

    // Navigate to initial path or current browser path
    const startPath = initialPath || this._getCurrentPath();
    this._handleRouteChange(startPath, false);
  }

  /**
   * Stop the router
   */
  stop() {
    this._isStarted = false;
    // Event listeners are cleaned up automatically when the page unloads
  }

  /**
   * Add before navigation hook
   * @param {Function} hook - Hook function
   */
  beforeEach(hook) {
    this.beforeHooks.push(hook);
  }

  /**
   * Add after navigation hook
   * @param {Function} hook - Hook function
   */
  afterEach(hook) {
    this.afterHooks.push(hook);
  }

  /**
   * Add error handler
   * @param {Function} handler - Error handler function
   */
  onError(handler) {
    this.errorHandlers.push(handler);
  }

  /**
   * Handle route changes
   * @param {string} path - New path
   * @param {boolean} isUserNavigation - Whether this is user-initiated navigation
   * @private
   */
  async _handleRouteChange(path, isUserNavigation) {
    if (!this._isStarted) return;

    try {
      // Parse path and query
      const [pathname, queryString] = path.split('?');
      const normalizedPath = this._normalizePath(pathname);
      const query = QueryParser.parse(queryString);

      // Find matching route
      const matchResult = this._findMatchingRoute(normalizedPath);

      if (!matchResult) {
        this._handleNotFound(normalizedPath);
        return;
      }

      const { route, params } = matchResult;

      // Create route context
      const to = {
        route,
        params,
        query,
        path: normalizedPath,
        fullPath: path
      };

      const from = {
        route: this.currentRoute,
        params: this.currentParams,
        query: this.currentQuery,
        path: this.currentRoute ? this.currentRoute.path : null
      };

      // Run before hooks
      const shouldContinue = await this._runBeforeHooks(to, from);
      if (!shouldContinue) return;

      // Update current route info
      this.currentRoute = route;
      this.currentParams = params;
      this.currentQuery = query;

      // Execute route handler
      await this._executeRouteHandler(route, to, from);

      // Run after hooks
      await this._runAfterHooks(to, from);

    } catch (error) {
      this._handleError(error, path);
    }
  }

  /**
   * Find matching route for path
   * @param {string} path - Path to match
   * @returns {Object|null} Match result or null
   * @private
   */
  _findMatchingRoute(path) {
    for (const route of this.routes) {
      const match = route.match(path);
      if (match) {
        return match;
      }
    }
    return null;
  }

  /**
   * Execute route handler
   * @param {Route} route - Matched route
   * @param {Object} to - Destination route info
   * @param {Object} from - Source route info
   * @private
   */
  async _executeRouteHandler(route, to, from) {
    if (typeof route.handler === 'function') {
      await route.handler(to, from);
    } else if (route.handler && typeof route.handler.render === 'function') {
      // Handle component-like objects
      await route.handler.render(to, from);
    }
  }

  /**
   * Run before navigation hooks
   * @param {Object} to - Destination route info
   * @param {Object} from - Source route info
   * @returns {boolean} Whether to continue navigation
   * @private
   */
  async _runBeforeHooks(to, from) {
    for (const hook of this.beforeHooks) {
      try {
        const result = await hook(to, from);
        if (result === false) {
          return false;
        }
      } catch (error) {
        this._handleError(error, to.fullPath);
        return false;
      }
    }
    return true;
  }

  /**
   * Run after navigation hooks
   * @param {Object} to - Destination route info
   * @param {Object} from - Source route info
   * @private
   */
  async _runAfterHooks(to, from) {
    for (const hook of this.afterHooks) {
      try {
        await hook(to, from);
      } catch (error) {
        this._handleError(error, to.fullPath);
      }
    }
  }

  /**
   * Handle 404 not found
   * @param {string} path - Path that wasn't found
   * @private
   */
  _handleNotFound(path) {
    const error = new Error(`Route not found: ${path}`);
    error.code = 'ROUTE_NOT_FOUND';
    error.path = path;
    this._handleError(error, path);
  }

  /**
   * Handle routing errors
   * @param {Error} error - Error that occurred
   * @param {string} path - Path where error occurred
   * @private
   */
  _handleError(error, path) {
    console.error('Router error:', error);

    // Try error handlers
    for (const handler of this.errorHandlers) {
      try {
        handler(error, path);
        return;
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    }

    // Default error handling
    console.error(`Unhandled router error at ${path}:`, error);
  }

  /**
   * Normalize path by removing base and handling case sensitivity
   * @param {string} path - Path to normalize
   * @returns {string} Normalized path
   * @private
   */
  _normalizePath(path) {
    let normalized = path;

    // Remove base path if configured
    if (this.options.base && normalized.startsWith(this.options.base)) {
      normalized = normalized.slice(this.options.base.length);
    }

    // Ensure path starts with /
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }

    // Handle case sensitivity
    if (!this.options.caseSensitive) {
      normalized = normalized.toLowerCase();
    }

    return normalized;
  }

  /**
   * Build URL with query parameters
   * @param {string} path - Base path
   * @param {Object} query - Query parameters
   * @returns {string} Complete URL
   */
  buildUrl(path, query = {}) {
    let url = this._normalizePath(path);

    const queryString = QueryParser.stringify(query);
    if (queryString) {
      url += '?' + queryString;
    }

    return url;
  }

  /**
   * Get debug information about the router
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      isStarted: this._isStarted,
      routeCount: this.routes.length,
      currentRoute: this.currentRoute?.path,
      currentParams: this.currentParams,
      currentQuery: this.currentQuery,
      options: this.options
    };
  }
}

// Export the router and related classes
export {
  TodoLangRouter,
  Route,
  QueryParser,
  HistoryManager
};