/*!
 * TodoLang Todo Application v1.0.0
 * Built: 2025-07-31T14:46:59.990Z
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

      appElement.innerHTML = `
        <div class="todo-app">
          <h1>TodoLang Todo Application</h1>
          <div class="todo-input-container">
            <input type="text" id="todo-input" class="todo-input" placeholder="What needs to be done?" />
            <button id="add-btn" class="add-btn">Add</button>
          </div>
          <div class="todo-list" id="todo-list">${this.renderTodos()}</div>
          <div class="todo-filters">
            <button class="filter-btn ${this.filter === 'all' ? 'active' : ''}" data-filter="all">All</button>
            <button class="filter-btn ${this.filter === 'active' ? 'active' : ''}" data-filter="active">Active</button>
            <button class="filter-btn ${this.filter === 'completed' ? 'active' : ''}" data-filter="completed">Completed</button>
          </div>
          <div class="todo-stats">${this.getActiveCount()} items left</div>
        </div>
      `;

      this.attachEventListeners();
    }

    renderTodos() {
      const filteredTodos = this.getFilteredTodos();

      if (filteredTodos.length === 0) {
        return '<div class="empty-state">No todos found. Add one above!</div>';
      }

      return filteredTodos.map(todo => `
        <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
          <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} />
          <span class="todo-text">${this.escapeHtml(todo.text)}</span>
          <div class="todo-actions">
            <button class="btn btn-edit">Edit</button>
            <button class="btn btn-danger btn-delete">Delete</button>
          </div>
        </div>
      `).join('');
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

  // Auto-initialization
  function initializeTodoLangApp() {
    try {
      const app = new TodoApp();
      app.init();
      console.log('✅ TodoLang Application initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize TodoLang Application:', error);

      const appElement = document.getElementById('app');
      if (appElement) {
        appElement.innerHTML = `
          <div class="todo-app">
            <div class="error">
              <h1>Application Error</h1>
              <p>Failed to initialize the TodoLang application. Please refresh the page.</p>
              <details>
                <summary>Error Details</summary>
                <pre>${error.message}</pre>
              </details>
            </div>
          </div>
        `;
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTodoLangApp);
  } else {
    initializeTodoLangApp();
  }

})(window, document);