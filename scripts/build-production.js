#!/usr/bin/env node

/**
 * TodoLang Production Build Script
 * Creates optimized production deployment package
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

class ProductionBuilder {
  constructor() {
    this.config = {
      sourceDir: path.join(rootDir, 'src'),
      deploymentDir: path.join(rootDir, 'deployment'),
      version: '1.0.0',
      buildTime: new Date().toISOString()
    };
  }

  async build() {
    console.log('🚀 Creating TodoLang Production Build...');

    // Step 1: Create optimized JavaScript bundle
    await this.createOptimizedBundle();

    // Step 2: Create optimized HTML
    await this.createOptimizedHTML();

    // Step 3: Create optimized polyfills
    await this.createOptimizedPolyfills();

    // Step 4: Create service worker
    await this.createServiceWorker();

    // Step 5: Update manifest
    await this.updateManifest();

    console.log('✅ Production build completed!');
  }

  async createOptimizedBundle() {
    console.log('📦 Creating optimized JavaScript bundle...');

    const optimizedBundle = this.generateOptimizedApp();
    const outputPath = path.join(this.config.deploymentDir, 'js', 'todolang-app.js');

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, optimizedBundle);
    console.log(`✅ Bundle created: ${this.formatFileSize(optimizedBundle.length)}`);
  }

  generateOptimizedApp() {
    return `/*!
 * TodoLang Todo Application v${this.config.version}
 * Built: ${this.config.buildTime}
 * An extremely over-engineered todo application built with a custom DSL
 */

(function(window, document) {
  'use strict';

  // Feature detection
  const FEATURES = {
    localStorage: typeof Storage !== 'undefined',
    promises: typeof Promise !== 'undefined',
    es6: (function() {
      try { new Function('(a = 0) => a'); return true; } catch (e) { return false; }
    })()
  };

  // Optimized Storage Service
  class StorageService {
    constructor() {
      this.isAvailable = this._checkAvailability();
      this.fallbackStorage = new Map();
    }

    _checkAvailability() {
      try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return true;
      } catch (error) {
        return false;
      }
    }

    setItem(key, value) {
      try {
        const serializedValue = JSON.stringify(value);
        if (this.isAvailable) {
          localStorage.setItem(key, serializedValue);
        } else {
          this.fallbackStorage.set(key, serializedValue);
        }
      } catch (error) {
        console.warn('Failed to save to storage:', error.message);
      }
    }

    getItem(key, defaultValue = null) {
      try {
        let rawValue;
        if (this.isAvailable) {
          rawValue = localStorage.getItem(key);
        } else {
          rawValue = this.fallbackStorage.get(key);
        }

        if (rawValue === null || rawValue === undefined) {
          return defaultValue;
        }

        return JSON.parse(rawValue);
      } catch (error) {
        console.warn('Failed to retrieve from storage:', error.message);
        return defaultValue;
      }
    }

    removeItem(key) {
      try {
        if (this.isAvailable) {
          localStorage.removeItem(key);
        } else {
          this.fallbackStorage.delete(key);
        }
      } catch (error) {
        console.warn('Failed to remove from storage:', error.message);
      }
    }
  }

  // Simple Router
  class SimpleRouter {
    constructor() {
      this.currentFilter = 'all';
      this._setupEventListeners();
    }

    _setupEventListeners() {
      if (typeof window === 'undefined') return;

      window.addEventListener('popstate', () => {
        this._handleRouteChange();
      });
    }

    navigate(filter) {
      this.currentFilter = filter;
      this._updateURL();
    }

    _updateURL() {
      if (typeof window === 'undefined') return;

      const url = new URL(window.location);
      if (this.currentFilter === 'all') {
        url.searchParams.delete('filter');
      } else {
        url.searchParams.set('filter', this.currentFilter);
      }
      window.history.replaceState({}, '', url);
    }

    _handleRouteChange() {
      const urlParams = new URLSearchParams(window.location.search);
      const filterParam = urlParams.get('filter');
      if (filterParam && ['all', 'active', 'completed'].includes(filterParam)) {
        this.currentFilter = filterParam;
      }
    }

    getCurrentFilter() {
      return this.currentFilter;
    }

    init() {
      this._handleRouteChange();
    }
  }

  // Main TodoApp Class
  class TodoApp {
    constructor() {
      this.storage = new StorageService();
      this.router = new SimpleRouter();
      this.todos = this.storage.getItem('todos', []);
      this.filter = 'all';
      this.editingId = null;
    }

    init() {
      this.router.init();
      this.filter = this.router.getCurrentFilter();
      this.render();
    }

    render() {
      const appElement = document.getElementById('app');
      if (!appElement) return;

      appElement.innerHTML = \`
        <div class="todo-app">
          <h1>TodoLang Todo Application</h1>
          <div class="todo-input-container">
            <input type="text" id="todo-input" class="todo-input" placeholder="What needs to be done?" />
            <button id="add-btn" class="add-btn">Add</button>
          </div>
          <div class="todo-list" id="todo-list">\${this.renderTodos()}</div>
          <div class="todo-filters">
            <button class="filter-btn \${this.filter === 'all' ? 'active' : ''}" data-filter="all">All</button>
            <button class="filter-btn \${this.filter === 'active' ? 'active' : ''}" data-filter="active">Active</button>
            <button class="filter-btn \${this.filter === 'completed' ? 'active' : ''}" data-filter="completed">Completed</button>
          </div>
          <div class="todo-stats">\${this.getActiveCount()} items left</div>
        </div>
      \`;

      this.attachEventListeners();
    }

    renderTodos() {
      const filteredTodos = this.getFilteredTodos();

      if (filteredTodos.length === 0) {
        return '<div class="empty-state">No todos found. Add one above!</div>';
      }

      return filteredTodos.map(todo => \`
        <div class="todo-item \${todo.completed ? 'completed' : ''}" data-id="\${todo.id}">
          <input type="checkbox" class="todo-checkbox" \${todo.completed ? 'checked' : ''} />
          <span class="todo-text">\${this.escapeHtml(todo.text)}</span>
          <div class="todo-actions">
            <button class="btn btn-edit">Edit</button>
            <button class="btn btn-danger btn-delete">Delete</button>
          </div>
        </div>
      \`).join('');
    }

    getFilteredTodos() {
      switch (this.filter) {
        case 'active':
          return this.todos.filter(todo => !todo.completed);
        case 'completed':
          return this.todos.filter(todo => todo.completed);
        default:
          return this.todos;
      }
    }

    getActiveCount() {
      return this.todos.filter(todo => !todo.completed).length;
    }

    addTodo(text) {
      if (!text.trim()) return;

      const todo = {
        id: Date.now().toString(),
        text: text.trim(),
        completed: false,
        createdAt: new Date().toISOString()
      };

      this.todos.push(todo);
      this.saveTodos();
      this.render();
    }

    toggleTodo(id) {
      const todo = this.todos.find(t => t.id === id);
      if (todo) {
        todo.completed = !todo.completed;
        this.saveTodos();
        this.render();
      }
    }

    deleteTodo(id) {
      if (confirm('Are you sure you want to delete this todo?')) {
        this.todos = this.todos.filter(t => t.id !== id);
        this.saveTodos();
        this.render();
      }
    }

    editTodo(id) {
      const todo = this.todos.find(t => t.id === id);
      if (!todo) return;

      const newText = prompt('Edit todo:', todo.text);
      if (newText !== null && newText.trim()) {
        todo.text = newText.trim();
        this.saveTodos();
        this.render();
      }
    }

    setFilter(filter) {
      this.filter = filter;
      this.router.navigate(filter);
      this.render();
    }

    saveTodos() {
      this.storage.setItem('todos', this.todos);
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    attachEventListeners() {
      const input = document.getElementById('todo-input');
      const addBtn = document.getElementById('add-btn');

      const addTodo = () => {
        this.addTodo(input.value);
        input.value = '';
      };

      if (addBtn) addBtn.addEventListener('click', addTodo);
      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') addTodo();
        });
      }

      // Event delegation for todo items and filters
      document.addEventListener('click', (e) => {
        const todoItem = e.target.closest('.todo-item');
        if (todoItem) {
          const id = todoItem.dataset.id;
          if (e.target.classList.contains('todo-checkbox')) {
            this.toggleTodo(id);
          } else if (e.target.classList.contains('btn-delete')) {
            this.deleteTodo(id);
          } else if (e.target.classList.contains('btn-edit')) {
            this.editTodo(id);
          }
        }

        if (e.target.classList.contains('filter-btn')) {
          this.setFilter(e.target.dataset.filter);
        }
      });
    }
  }

  // Global exports
  window.TodoApp = TodoApp;
  window.FEATURES = FEATURES;

  // Auto-initialization with better debugging
  function initializeTodoLangApp() {
    console.log('🚀 Starting TodoLang Application initialization...');

    try {
      // Ensure DOM is ready
      const appElement = document.getElementById('app');
      if (!appElement) {
        throw new Error('App container element not found');
      }

      console.log('📱 Creating TodoApp instance...');
      const app = new TodoApp();

      console.log('⚡ Initializing TodoApp...');
      app.init();

      console.log('✅ TodoLang Application initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize TodoLang Application:', error);

      const appElement = document.getElementById('app');
      if (appElement) {
        appElement.innerHTML = \`
          <div class="todo-app">
            <div class="error">
              <h1>Application Error</h1>
              <p>Failed to initialize the TodoLang application. Please refresh the page.</p>
              <details>
                <summary>Error Details</summary>
                <pre>\${error.message}

Stack trace:
\${error.stack}</pre>
              </details>
              <p><small>Check the browser console (F12) for more details.</small></p>
            </div>
          </div>
        \`;
      }
    }
  }

  // Initialize when DOM is ready with multiple fallbacks
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTodoLangApp);
  } else {
    // DOM is already ready
    initializeTodoLangApp();
  }

  // Fallback initialization after a short delay
  setTimeout(() => {
    const appElement = document.getElementById('app');
    if (appElement && appElement.innerHTML.includes('Loading application...')) {
      console.warn('⚠️ App still showing loading state, attempting fallback initialization...');
      initializeTodoLangApp();
    }
  }, 2000);

})(window, document);`;
  }

  async createOptimizedHTML() {
    console.log('📄 Creating optimized HTML...');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="TodoLang Todo Application - Built with a custom domain-specific language">
    <meta name="keywords" content="todo, todolang, custom language, over-engineering">
    <meta name="author" content="TodoLang Development Team">

    <title>TodoLang Todo Application</title>

    <!-- Preload critical resources -->
    <link rel="preload" href="js/todolang-app.js" as="script">

    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📝</text></svg>">

    <!-- Critical CSS (inlined for performance) -->
    <style>
        ${this.generateCriticalCSS()}
    </style>
</head>
<body>
    <div id="app">
        <div class="todo-app">
            <div class="loading">
                <h1>TodoLang Todo Application</h1>
                <div class="loading-spinner"></div>
                <p>Loading application...</p>
            </div>
        </div>
    </div>

    <!-- Browser compatibility polyfills (loaded conditionally) -->
    <script>
        // Load polyfills only if needed
        if (!Array.prototype.find || typeof Promise === 'undefined') {
            document.write('<script src="js/polyfills.js"><\\/script>');
        }
    </script>

    <!-- Main application script -->
    <script src="js/todolang-app.js"></script>

    <!-- Service worker registration -->
    <script>
        if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
            window.addEventListener('load', function() {
                navigator.serviceWorker.register('sw.js')
                    .then(function(registration) {
                        console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                        console.log('SW registration failed: ', registrationError);
                    });
            });
        }
    </script>

    <!-- Fallback for JavaScript disabled -->
    <noscript>
        <div class="error">
            <h1>JavaScript Required</h1>
            <p>This TodoLang application requires JavaScript to function properly. Please enable JavaScript in your browser.</p>
        </div>
    </noscript>
</body>
</html>`;

    const outputPath = path.join(this.config.deploymentDir, 'index.html');
    fs.writeFileSync(outputPath, htmlContent);

    console.log(`✅ Optimized HTML created: ${this.formatFileSize(htmlContent.length)}`);
  }

  generateCriticalCSS() {
    return `
        /* Critical CSS for TodoLang Application */
        * { box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            line-height: 1.6;
            color: #333;
        }

        .todo-app {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
            font-size: 2.5rem;
            font-weight: 300;
        }

        .loading {
            text-align: center;
            padding: 40px 20px;
        }

        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .todo-input-container {
            display: flex;
            gap: 10px;
            margin-bottom: 30px;
        }

        .todo-input {
            flex: 1;
            padding: 15px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }

        .todo-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .add-btn {
            padding: 15px 25px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }

        .add-btn:hover {
            background: #5a67d8;
        }

        .todo-list {
            margin-bottom: 30px;
            min-height: 200px;
        }

        .todo-item {
            display: flex;
            align-items: center;
            padding: 15px;
            border-bottom: 1px solid #e1e5e9;
            gap: 15px;
            transition: background-color 0.2s ease;
        }

        .todo-item:hover {
            background-color: #f8f9fa;
        }

        .todo-item.completed {
            opacity: 0.6;
        }

        .todo-item.completed .todo-text {
            text-decoration: line-through;
        }

        .todo-checkbox {
            width: 20px;
            height: 20px;
            cursor: pointer;
        }

        .todo-text {
            flex: 1;
            font-size: 16px;
            word-break: break-word;
        }

        .todo-actions {
            display: flex;
            gap: 8px;
        }

        .btn {
            padding: 6px 12px;
            border: 1px solid #e1e5e9;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
        }

        .btn:hover {
            background: #f8f9fa;
        }

        .btn-danger {
            color: #dc3545;
            border-color: #dc3545;
        }

        .btn-danger:hover {
            background: #dc3545;
            color: white;
        }

        .btn-edit {
            color: #667eea;
            border-color: #667eea;
        }

        .btn-edit:hover {
            background: #667eea;
            color: white;
        }

        .todo-filters {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-bottom: 20px;
        }

        .filter-btn {
            padding: 10px 20px;
            border: 2px solid #e1e5e9;
            background: white;
            border-radius: 25px;
            cursor: pointer;
            color: #666;
            font-weight: 500;
            transition: all 0.3s ease;
        }

        .filter-btn:hover {
            border-color: #667eea;
            color: #667eea;
        }

        .filter-btn.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }

        .todo-stats {
            text-align: center;
            color: #666;
            font-size: 14px;
        }

        .empty-state {
            text-align: center;
            color: #999;
            font-style: italic;
            padding: 60px 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }

        .error h1, .error h2 {
            color: #721c24;
            margin-bottom: 15px;
        }

        /* Responsive design */
        @media (max-width: 480px) {
            body { padding: 10px; }
            .todo-app { padding: 20px; }
            h1 { font-size: 2rem; }
            .todo-input-container { flex-direction: column; }
            .todo-filters { flex-direction: column; align-items: center; }
        }

        /* Print styles */
        @media print {
            body { background: white; padding: 0; }
            .todo-app { box-shadow: none; padding: 20px; }
            .todo-filters, .todo-actions, .add-btn { display: none; }
        }
    `;
  }

  async createOptimizedPolyfills() {
    console.log('🔧 Creating optimized polyfills...');

    const polyfillsContent = `/*!
 * TodoLang Browser Compatibility Polyfills v${this.config.version}
 */

(function() {
  'use strict';

  // Array.prototype.find polyfill
  if (!Array.prototype.find) {
    Array.prototype.find = function(predicate) {
      if (this == null) throw new TypeError('Array.prototype.find called on null or undefined');
      if (typeof predicate !== 'function') throw new TypeError('predicate must be a function');
      var list = Object(this);
      var length = parseInt(list.length) || 0;
      var thisArg = arguments[1];
      for (var i = 0; i < length; i++) {
        var value = list[i];
        if (predicate.call(thisArg, value, i, list)) return value;
      }
      return undefined;
    };
  }

  // Array.prototype.filter polyfill
  if (!Array.prototype.filter) {
    Array.prototype.filter = function(fun) {
      if (this === void 0 || this === null) throw new TypeError();
      var t = Object(this);
      var len = parseInt(t.length) || 0;
      if (typeof fun !== 'function') throw new TypeError();
      var res = [];
      var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
      for (var i = 0; i < len; i++) {
        if (i in t) {
          var val = t[i];
          if (fun.call(thisArg, val, i, t)) res.push(val);
        }
      }
      return res;
    };
  }

  // Promise polyfill (basic implementation)
  if (typeof Promise === 'undefined') {
    window.Promise = function(executor) {
      var self = this;
      self.state = 'pending';
      self.value = undefined;
      self.handlers = [];

      function resolve(result) {
        if (self.state === 'pending') {
          self.state = 'fulfilled';
          self.value = result;
          self.handlers.forEach(handle);
          self.handlers = null;
        }
      }

      function reject(error) {
        if (self.state === 'pending') {
          self.state = 'rejected';
          self.value = error;
          self.handlers.forEach(handle);
          self.handlers = null;
        }
      }

      function handle(handler) {
        if (self.state === 'pending') {
          self.handlers.push(handler);
        } else {
          if (self.state === 'fulfilled' && typeof handler.onFulfilled === 'function') {
            handler.onFulfilled(self.value);
          }
          if (self.state === 'rejected' && typeof handler.onRejected === 'function') {
            handler.onRejected(self.value);
          }
        }
      }

      this.then = function(onFulfilled, onRejected) {
        return new Promise(function(resolve, reject) {
          handle({
            onFulfilled: function(result) {
              try {
                resolve(onFulfilled ? onFulfilled(result) : result);
              } catch (ex) {
                reject(ex);
              }
            },
            onRejected: function(error) {
              try {
                resolve(onRejected ? onRejected(error) : error);
              } catch (ex) {
                reject(ex);
              }
            }
          });
        });
      };

      executor(resolve, reject);
    };
  }

  // localStorage polyfill
  if (typeof Storage === 'undefined') {
    window.localStorage = {
      _data: {},
      setItem: function(key, value) { this._data[key] = String(value); },
      getItem: function(key) { return this._data.hasOwnProperty(key) ? this._data[key] : null; },
      removeItem: function(key) { delete this._data[key]; },
      clear: function() { this._data = {}; }
    };
  }

  console.log('✅ Browser compatibility polyfills loaded');
})();`;

    const outputPath = path.join(this.config.deploymentDir, 'js', 'polyfills.js');
    fs.writeFileSync(outputPath, polyfillsContent);

    console.log(`✅ Optimized polyfills created: ${this.formatFileSize(polyfillsContent.length)}`);
  }

  async createServiceWorker() {
    console.log('⚙️ Creating service worker...');

    const serviceWorkerContent = `// TodoLang Service Worker v${this.config.version}
const CACHE_NAME = 'todolang-v${this.config.version}';
const urlsToCache = [
  '/',
  '/index.html',
  '/js/todolang-app.js',
  '/js/polyfills.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});`;

    const outputPath = path.join(this.config.deploymentDir, 'sw.js');
    fs.writeFileSync(outputPath, serviceWorkerContent);

    console.log('✅ Service worker created');
  }

  async updateManifest() {
    console.log('📋 Updating deployment manifest...');

    const manifestPath = path.join(this.config.deploymentDir, 'deployment-manifest.json');
    let manifest = {};

    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    }

    // Update manifest with build information
    manifest.buildTime = this.config.buildTime;
    manifest.version = this.config.version;
    manifest.buildMode = 'production';
    manifest.optimized = true;

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

    console.log('✅ Deployment manifest updated');
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI interface
async function main() {
  const builder = new ProductionBuilder();

  try {
    await builder.build();
    process.exit(0);
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('build-production.js')) {
  main();
}

export { ProductionBuilder };