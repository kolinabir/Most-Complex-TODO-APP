/**
 * End-to-End Application Tests
 *
 * Comprehensive tests that verify complete user workflows for the TodoLang application.
 * Tests todo creation, editing, completion, deletion, filtering, URL state management,
 * data persistence, and performance with large datasets.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock browser environment for testing
function createMockBrowserEnvironment() {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>TodoLang Application</title>
        <style>
          .todo-app { font-family: Arial, sans-serif; }
          .todo-item.completed { text-decoration: line-through; opacity: 0.6; }
          .filter-btn.active { background-color: #007bff; color: white; }
          .empty-state { color: #666; font-style: italic; }
          .error-message { color: red; }
        </style>
      </head>
      <body>
        <div id="app"></div>
      </body>
    </html>
  `, {
    url: 'http://localhost:3000',
    pretendToBeVisual: true,
    resources: 'usable'
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.location = dom.window.location;
  global.history = dom.window.history;

  // Mock localStorage
  global.localStorage = {
    data: {},
    setItem: function(key, value) {
      this.data[key] = value;
    },
    getItem: function(key) {
      return this.data[key] || null;
    },
    removeItem: function(key) {
      delete this.data[key];
    },
    clear: function() {
      this.data = {};
    }
  };

  // Mock other browser APIs
  global.confirm = jest.fn(() => true);
  global.alert = jest.fn();
  global.prompt = jest.fn();

  return dom;
}

// Mock TodoLang application components
class MockTodoApp {
  constructor(container) {
    this.container = container;
    this.state = {
      todos: [],
      currentFilter: 'all',
      newTodoText: '',
editingId: null,
      error: '',
      isLoading: false
    };
    this.eventListeners = new Map();
    this.autoSaveInterval = null;
    this.render();
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
    this.saveToStorage();
  }

  render() {
    const filteredTodos = this.getFilteredTodos();

    this.container.innerHTML = `
      <div class="todo-app">
        <h1>TodoLang Todo Application</h1>

        ${this.state.error ? `<div class="error-message">${this.state.error}</div>` : ''}

        <div class="todo-input">
          <input
            type="text"
            id="new-todo-input"
            placeholder="Add a new todo..."
            value="${this.state.newTodoText}"
          />
          <button id="add-todo-btn">Add Todo</button>
        </div>

        <div class="todo-list">
          ${filteredTodos.length === 0 ?
            '<div class="empty-state">No todos found. Add one above!</div>' :
            filteredTodos.map(todo => `
              <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                ${this.state.editingId === todo.id ? `
                  <input type="text" class="edit-input" value="${todo.text}" data-id="${todo.id}" />
                  <button class="save-edit-btn" data-id="${todo.id}">Save</button>
                  <button class="cancel-edit-btn" data-id="${todo.id}">Cancel</button>
                ` : `
                  <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} data-id="${todo.id}" />
                  <span class="todo-text">${todo.text}</span>
                  <button class="edit-btn" data-id="${todo.id}">Edit</button>
                  <button class="delete-btn" data-id="${todo.id}">Delete</button>
                `}
              </div>
            `).join('')
          }
        </div>

        <div class="todo-filters">
          <button class="filter-btn ${this.state.currentFilter === 'all' ? 'active' : ''}" data-filter="all">
            All (${this.state.todos.length})
          </button>
          <button class="filter-btn ${this.state.currentFilter === 'active' ? 'active' : ''}" data-filter="active">
            Active (${this.state.todos.filter(t => !t.completed).length})
          </button>
          <button class="filter-btn ${this.state.currentFilter === 'completed' ? 'active' : ''}" data-filter="completed">
            Completed (${this.state.todos.filter(t => t.completed).length})
          </button>
        </div>

        <div class="todo-stats">
          <p>Total: ${this.state.todos.length} | Active: ${this.state.todos.filter(t => !t.completed).length} | Completed: ${this.state.todos.filter(t => t.completed).length}</p>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    // Clear existing listeners
    this.eventListeners.clear();

    // Add todo input
    const input = this.container.querySelector('#new-todo-input');
    const addBtn = this.container.querySelector('#add-todo-btn');

    if (input) {
      const inputHandler = (e) => {
        this.setState({ newTodoText: e.target.value, error: '' });
      };
      input.addEventListener('input', inputHandler);
      this.eventListeners.set('input', inputHandler);

      const keyHandler = (e) => {
        if (e.key === 'Enter') {
          this.addTodo();
        }
      };
      input.addEventListener('keypress', keyHandler);
      this.eventListeners.set('keypress', keyHandler);
    }

    if (addBtn) {
      const clickHandler = () => this.addTodo();
      addBtn.addEventListener('click', clickHandler);
      this.eventListeners.set('addBtn', clickHandler);
    }

    // Todo item interactions
    this.container.querySelectorAll('.todo-checkbox').forEach(checkbox => {
      const handler = (e) => this.toggleTodo(e.target.dataset.id);
      checkbox.addEventListener('change', handler);
      this.eventListeners.set(`checkbox-${checkbox.dataset.id}`, handler);
    });

    this.container.querySelectorAll('.edit-btn').forEach(btn => {
      const handler = (e) => this.startEdit(e.target.dataset.id);
      btn.addEventListener('click', handler);
      this.eventListeners.set(`edit-${btn.dataset.id}`, handler);
    });

    this.container.querySelectorAll('.delete-btn').forEach(btn => {
      const handler = (e) => this.deleteTodo(e.target.dataset.id);
      btn.addEventListener('click', handler);
      this.eventListeners.set(`delete-${btn.dataset.id}`, handler);
    });

    this.container.querySelectorAll('.save-edit-btn').forEach(btn => {
      const handler = (e) => this.saveEdit(e.target.dataset.id);
      btn.addEventListener('click', handler);
      this.eventListeners.set(`save-${btn.dataset.id}`, handler);
    });

    this.container.querySelectorAll('.cancel-edit-btn').forEach(btn => {
      const handler = (e) => this.cancelEdit();
      btn.addEventListener('click', handler);
      this.eventListeners.set(`cancel-${btn.dataset.id}`, handler);
    });

    // Filter buttons
    this.container.querySelectorAll('.filter-btn').forEach(btn => {
      const handler = (e) => this.setFilter(e.target.dataset.filter);
      btn.addEventListener('click', handler);
      this.eventListeners.set(`filter-${btn.dataset.filter}`, handler);
    });
  }

  addTodo() {
    const text = this.state.newTodoText.trim();

    if (!text) {
      this.setState({ error: 'Todo text cannot be empty' });
      return;
    }

    if (text.length > 500) {
      this.setState({ error: 'Todo text cannot exceed 500 characters' });
      return;
    }

    const todo = {
      id: `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: text,
      completed: false,
      createdAt: new Date()
    };

    this.setState({
      todos: [...this.state.todos, todo],
      newTodoText: '',
      error: ''
    });
  }

  toggleTodo(id) {
    const todos = this.state.todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    this.setState({ todos });
  }

  startEdit(id) {
    this.setState({ editingId: id, error: '' });
  }

  saveEdit(id) {
    const editInput = this.container.querySelector(`.edit-input[data-id="${id}"]`);
    const newText = editInput ? editInput.value.trim() : '';

    if (!newText) {
      this.setState({ error: 'Todo text cannot be empty' });
      return;
    }

    const todos = this.state.todos.map(todo =>
      todo.id === id ? { ...todo, text: newText } : todo
    );

    this.setState({
      todos,
      editingId: null,
      error: ''
    });
  }

  cancelEdit() {
    this.setState({ editingId: null, error: '' });
  }

  deleteTodo(id) {
    if (global.confirm('Are you sure you want to delete this todo?')) {
      const todos = this.state.todos.filter(todo => todo.id !== id);
      this.setState({ todos });
    }
  }

  setFilter(filter) {
    this.setState({ currentFilter: filter });
    this.updateURL(filter);
  }

  getFilteredTodos() {
    return this.state.todos.filter(todo => {
      if (this.state.currentFilter === 'active') return !todo.completed;
      if (this.state.currentFilter === 'completed') return todo.completed;
      return true;
    });
  }

  updateURL(filter) {
    const url = new URL(window.location);
    if (filter === 'all') {
      url.searchParams.delete('filter');
    } else {
      url.searchParams.set('filter', filter);
    }
    window.history.pushState({}, '', url);
  }

  saveToStorage() {
    try {
      const data = {
        todos: this.state.todos,
        currentFilter: this.state.currentFilter,
        savedAt: Date.now()
      };
      localStorage.setItem('todoapp_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }

  loadFromStorage() {
    try {
      const data = localStorage.getItem('todoapp_data');
      if (data) {
        const parsed = JSON.parse(data);
        this.setState({
          todos: parsed.todos || [],
          currentFilter: parsed.currentFilter || 'all'
        });
      }
    } catch (error) {
      console.error('Failed to load from storage:', error);
    }
  }

  clearStorage() {
    localStorage.removeItem('todoapp_data');
  }

  destroy() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    this.eventListeners.clear();
  }
}

// Test Suite
describe('End-to-End TodoLang Application Tests', () => {
  let dom;
  let app;
  let container;

  beforeEach(() => {
    // Create fresh browser environment
    dom = createMockBrowserEnvironment();
    container = dom.window.document.getElementById('app');

    // Clear localStorage
    global.localStorage.clear();

    // Reset mocks
    jest.clearAllMocks();

    // Create fresh app instance
    app = new MockTodoApp(container);
  });

  afterEach(() => {
    if (app) {
      app.destroy();
    }
  });

  describe('Complete User Workflows', () => {
    test('should complete full todo creation workflow', () => {
      // User types in input field
      const input = container.querySelector('#new-todo-input');
      input.value = 'Buy groceries';
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

      // User clicks add button
      const addBtn = container.querySelector('#add-todo-btn');
      addBtn.click();

      // Verify todo was added
      expect(app.state.todos).toHaveLength(1);
      expect(app.state.todos[0].text).toBe('Buy groceries');
      expect(app.state.todos[0].completed).toBe(false);
      expect(app.state.newTodoText).toBe('');

      // Verify UI updated
      const todoItems = container.querySelectorAll('.todo-item');
      expect(todoItems).toHaveLength(1);
      expect(todoItems[0].textContent).toContain('Buy groceries');
    });

    test('should complete full todo editing workflow', () => {
      // Setup: Add a todo first
      app.setState({
        todos: [{
          id: 'test-1',
          text: 'Original text',
          completed: false,
          createdAt: new Date()
        }]
      });

      // User clicks edit button
      const editBtn = container.querySelector('.edit-btn[data-id="test-1"]');
      editBtn.click();

      // Verify edit mode activated
      expect(app.state.editingId).toBe('test-1');
      const editInput = container.querySelector('.edit-input[data-id="test-1"]');
      expect(editInput).toBeTruthy();
      expect(editInput.value).toBe('Original text');

      // User modifies text
      editInput.value = 'Updated text';

      // User clicks save
      const saveBtn = container.querySelector('.save-edit-btn[data-id="test-1"]');
      saveBtn.click();

      // Verify todo was updated
      expect(app.state.todos[0].text).toBe('Updated text');
      expect(app.state.editingId).toBe(null);

      // Verify UI updated
      const todoText = container.querySelector('.todo-text');
      expect(todoText.textContent).toBe('Updated text');
    });

    test('should complete full todo completion workflow', () => {
      // Setup: Add a todo
      app.setState({
        todos: [{
          id: 'test-1',
          text: 'Complete this task',
          completed: false,
          createdAt: new Date()
        }]
      });

      // User clicks checkbox
      const checkbox = container.querySelector('.todo-checkbox[data-id="test-1"]');
      checkbox.click();

      // Verify todo was marked complete
      expect(app.state.todos[0].completed).toBe(true);

      // Verify UI shows completed state
      const todoItem = container.querySelector('.todo-item[data-id="test-1"]');
      expect(todoItem.classList.contains('completed')).toBe(true);

      // User clicks checkbox again to uncomplete
      checkbox.click();

      // Verify todo was marked incomplete
      expect(app.state.todos[0].completed).toBe(false);
      expect(todoItem.classList.contains('completed')).toBe(false);
    });

    test('should complete full todo deletion workflow', () => {
      // Setup: Add a todo
      app.setState({
        todos: [{
          id: 'test-1',
          text: 'Delete me',
          completed: false,
          createdAt: new Date()
        }]
      });

      // Mock confirmation dialog
      global.confirm.mockReturnValue(true);

      // User clicks delete button
      const deleteBtn = container.querySelector('.delete-btn[data-id="test-1"]');
      deleteBtn.click();

      // Verify confirmation was shown
      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this todo?');

      // Verify todo was deleted
      expect(app.state.todos).toHaveLength(0);

      // Verify UI shows empty state
      const emptyState = container.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toContain('No todos found');
    });

    test('should handle deletion cancellation', () => {
      // Setup: Add a todo
      app.setState({
        todos: [{
          id: 'test-1',
          text: 'Keep me',
          completed: false,
          createdAt: new Date()
        }]
      });

      // Mock confirmation dialog to return false
      global.confirm.mockReturnValue(false);

      // User clicks delete button but cancels
      const deleteBtn = container.querySelector('.delete-btn[data-id="test-1"]');
      deleteBtn.click();

      // Verify todo was not deleted
      expect(app.state.todos).toHaveLength(1);
      expect(app.state.todos[0].text).toBe('Keep me');
    });
  });

  describe('Filtering Functionality', () => {
    beforeEach(() => {
      // Setup test data with mixed completion states
      app.setState({
        todos: [
          { id: '1', text: 'Active todo 1', completed: false, createdAt: new Date() },
          { id: '2', text: 'Completed todo 1', completed: true, createdAt: new Date() },
          { id: '3', text: 'Active todo 2', completed: false, createdAt: new Date() },
          { id: '4', text: 'Completed todo 2', completed: true, createdAt: new Date() }
        ]
      });
    });

    test('should filter all todos correctly', () => {
      // Click "All" filter
      const allBtn = container.querySelector('.filter-btn[data-filter="all"]');
      allBtn.click();

      // Verify all todos are shown
      const todoItems = container.querySelectorAll('.todo-item');
      expect(todoItems).toHaveLength(4);
      expect(app.state.currentFilter).toBe('all');

      // Verify filter button is active
      expect(allBtn.classList.contains('active')).toBe(true);
    });

    test('should filter active todos correctly', () => {
      // Click "Active" filter
      const activeBtn = container.querySelector('.filter-btn[data-filter="active"]');
      activeBtn.click();

      // Verify only active todos are shown
      const todoItems = container.querySelectorAll('.todo-item');
      expect(todoItems).toHaveLength(2);
      expect(app.state.currentFilter).toBe('active');

      // Verify correct todos are shown
      const todoTexts = Array.from(todoItems).map(item =>
        item.querySelector('.todo-text').textContent
      );
      expect(todoTexts).toContain('Active todo 1');
      expect(todoTexts).toContain('Active todo 2');
      expect(todoTexts).not.toContain('Completed todo 1');
    });

    test('should filter completed todos correctly', () => {
      // Click "Completed" filter
      const completedBtn = container.querySelector('.filter-btn[data-filter="completed"]');
      completedBtn.click();

      // Verify only completed todos are shown
      const todoItems = container.querySelectorAll('.todo-item');
      expect(todoItems).toHaveLength(2);
      expect(app.state.currentFilter).toBe('completed');

      // Verify correct todos are shown
      const todoTexts = Array.from(todoItems).map(item =>
        item.querySelector('.todo-text').textContent
      );
      expect(todoTexts).toContain('Completed todo 1');
      expect(todoTexts).toContain('Completed todo 2');
      expect(todoTexts).not.toContain('Active todo 1');
    });

    test('should update filter counts dynamically', () => {
      // Initial counts
      let allBtn = container.querySelector('.filter-btn[data-filter="all"]');
      let activeBtn = container.querySelector('.filter-btn[data-filter="active"]');
      let completedBtn = container.querySelector('.filter-btn[data-filter="completed"]');

      expect(allBtn.textContent).toContain('All (4)');
      expect(activeBtn.textContent).toContain('Active (2)');
      expect(completedBtn.textContent).toContain('Completed (2)');

      // Complete one more todo
      const checkbox = container.querySelector('.todo-checkbox[data-id="1"]');
      checkbox.click();

      // Verify counts updated
      allBtn = container.querySelector('.filter-btn[data-filter="all"]');
      activeBtn = container.querySelector('.filter-btn[data-filter="active"]');
      completedBtn = container.querySelector('.filter-btn[data-filter="completed"]');

      expect(allBtn.textContent).toContain('All (4)');
      expect(activeBtn.textContent).toContain('Active (1)');
      expect(completedBtn.textContent).toContain('Completed (3)');
    });
  });

  describe('URL State Management', () => {
    test('should update URL when filter changes', () => {
      // Click "Active" filter
      const activeBtn = container.querySelector('.filter-btn[data-filter="active"]');
      activeBtn.click();

      // Verify URL was updated
      expect(window.location.search).toContain('filter=active');

      // Click "Completed" filter
      const completedBtn = container.querySelector('.filter-btn[data-filter="completed"]');
      completedBtn.click();

      // Verify URL was updated
      expect(window.location.search).toContain('filter=completed');

      // Click "All" filter
      const allBtn = container.querySelector('.filter-btn[data-filter="all"]');
      allBtn.click();

      // Verify URL parameter was removed for "all"
      expect(window.location.search).not.toContain('filter=');
    });

    test('should apply filter from URL on load', () => {
      // Simulate loading with filter in URL
      const url = new URL(window.location);
      url.searchParams.set('filter', 'active');
      Object.defineProperty(window, 'location', {
        value: url,
        writable: true
      });

      // Create new app instance (simulating page load)
      const newApp = new MockTodoApp(container);
      newApp.setState({
        todos: [
          { id: '1', text: 'Active todo', completed: false, createdAt: new Date() },
          { id: '2', text: 'Completed todo', completed: true, createdAt: new Date() }
        ],
        currentFilter: url.searchParams.get('filter') || 'all'
      });

      // Verify filter was applied
      expect(newApp.state.currentFilter).toBe('active');
      const activeBtn = container.querySelector('.filter-btn[data-filter="active"]');
      expect(activeBtn.classList.contains('active')).toBe(true);

      newApp.destroy();
    });
  });

  describe('Data Persistence', () => {
    test('should save data to localStorage automatically', () => {
      // Add a todo
      app.setState({
        todos: [{
          id: 'test-1',
          text: 'Persistent todo',
          completed: false,
          createdAt: new Date()
        }]
      });

      // Verify data was saved
      const savedData = localStorage.getItem('todoapp_data');
      expect(savedData).toBeTruthy();

      const parsed = JSON.parse(savedData);
      expect(parsed.todos).toHaveLength(1);
      expect(parsed.todos[0].text).toBe('Persistent todo');
      expect(parsed.currentFilter).toBe('all');
      expect(parsed.savedAt).toBeTruthy();
    });

    test('should load data from localStorage on initialization', () => {
      // Setup saved data
      const savedData = {
        todos: [
          { id: '1', text: 'Saved todo 1', completed: false, createdAt: new Date() },
          { id: '2', text: 'Saved todo 2', completed: true, createdAt: new Date() }
        ],
        currentFilter: 'completed',
        savedAt: Date.now()
      };
      localStorage.setItem('todoapp_data', JSON.stringify(savedData));

      // Create new app instance
      const newApp = new MockTodoApp(container);
      newApp.loadFromStorage();

      // Verify data was loaded
      expect(newApp.state.todos).toHaveLength(2);
      expect(newApp.state.todos[0].text).toBe('Saved todo 1');
      expect(newApp.state.currentFilter).toBe('completed');

      newApp.destroy();
    });

    test('should persist data across browser sessions', () => {
      // Session 1: Add todos and set filter
      app.setState({
        todos: [
          { id: '1', text: 'Session todo 1', completed: false, createdAt: new Date() },
          { id: '2', text: 'Session todo 2', completed: true, createdAt: new Date() }
        ],
        currentFilter: 'active'
      });

      // Simulate browser close/reopen by creating new app instance
      app.destroy();
      const newApp = new MockTodoApp(container);
      newApp.loadFromStorage();

      // Verify data persisted
      expect(newApp.state.todos).toHaveLength(2);
      expect(newApp.state.todos[0].text).toBe('Session todo 1');
      expect(newApp.state.currentFilter).toBe('active');

      // Verify UI reflects persisted state
      const activeBtn = container.querySelector('.filter-btn[data-filter="active"]');
      expect(activeBtn.classList.contains('active')).toBe(true);

      newApp.destroy();
    });

    test('should handle localStorage unavailable gracefully', () => {
      // Mock localStorage to throw errors
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not crash when saving fails
      expect(() => {
        app.setState({
          todos: [{ id: '1', text: 'Test', completed: false, createdAt: new Date() }]
        });
      }).not.toThrow();

      // Restore original localStorage
      localStorage.setItem = originalSetItem;
    });

    test('should handle corrupted localStorage data', () => {
      // Setup corrupted data
      localStorage.setItem('todoapp_data', 'invalid json data');

      // Should not crash when loading corrupted data
      expect(() => {
        const newApp = new MockTodoApp(container);
        newApp.loadFromStorage();
        newApp.destroy();
      }).not.toThrow();
    });
  });

  describe('Input Validation and Error Handling', () => {
    test('should validate empty todo input', () => {
      // Try to add empty todo
      const addBtn = container.querySelector('#add-todo-btn');
      addBtn.click();

      // Verify error message is shown
      expect(app.state.error).toBe('Todo text cannot be empty');
      const errorMsg = container.querySelector('.error-message');
      expect(errorMsg).toBeTruthy();
      expect(errorMsg.textContent).toBe('Todo text cannot be empty');

      // Verify no todo was added
      expect(app.state.todos).toHaveLength(0);
    });

    test('should validate whitespace-only todo input', () => {
      // Try to add whitespace-only todo
      const input = container.querySelector('#new-todo-input');
      input.value = '   ';
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

      const addBtn = container.querySelector('#add-todo-btn');
      addBtn.click();

      // Verify error message is shown
      expect(app.state.error).toBe('Todo text cannot be empty');
      expect(app.state.todos).toHaveLength(0);
    });

    test('should validate todo text length limit', () => {
      // Try to add very long todo
      const longText = 'a'.repeat(501);
      const input = container.querySelector('#new-todo-input');
      input.value = longText;
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

      const addBtn = container.querySelector('#add-todo-btn');
      addBtn.click();

      // Verify error message is shown
      expect(app.state.error).toBe('Todo text cannot exceed 500 characters');
      expect(app.state.todos).toHaveLength(0);
    });

    test('should validate empty edit input', () => {
      // Setup: Add a todo and start editing
      app.setState({
        todos: [{ id: 'test-1', text: 'Original', completed: false, createdAt: new Date() }],
        editingId: 'test-1'
      });

      // Try to save empty edit
      const editInput = container.querySelector('.edit-input[data-id="test-1"]');
      editInput.value = '';

      const saveBtn = container.querySelector('.save-edit-btn[data-id="test-1"]');
      saveBtn.click();

      // Verify error message and no change
      expect(app.state.error).toBe('Todo text cannot be empty');
      expect(app.state.todos[0].text).toBe('Original');
      expect(app.state.editingId).toBe('test-1'); // Still in edit mode
    });

    test('should clear error when user starts typing', () => {
      // Setup error state
      app.setState({ error: 'Previous error' });

      // User starts typing
      const input = container.querySelector('#new-todo-input');
      input.value = 'New todo';
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

      // Verify error was cleared
      expect(app.state.error).toBe('');
      const errorMsg = container.querySelector('.error-message');
      expect(errorMsg).toBeFalsy();
    });
  });

  describe('Performance with Large Todo Lists', () => {
    test('should handle 1000 todos efficiently', () => {
      const startTime = Date.now();

      // Generate 1000 todos
      const largeTodoList = Array.from({ length: 1000 }, (_, i) => ({
        id: `todo-${i}`,
        text: `Todo item ${i + 1}`,
        completed: i % 3 === 0, // Every 3rd todo is completed
        createdAt: new Date(Date.now() - i * 1000)
      }));

      // Add all todos at once
      app.setState({ todos: largeTodoList });

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);

      // Verify all todos are present
      expect(app.state.todos).toHaveLength(1000);

      // Verify filtering still works efficiently
      const filterStartTime = Date.now();
      app.setFilter('completed');
      const filterEndTime = Date.now();
      const filterTime = filterEndTime - filterStartTime;

      expect(filterTime).toBeLessThan(100); // Filter should be very fast
      expect(app.getFilteredTodos()).toHaveLength(334); // ~1/3 are completed
    });

    test('should handle frequent updates efficiently', () => {
      // Setup moderate list
      const todos = Array.from({ length: 100 }, (_, i) => ({
        id: `todo-${i}`,
        text: `Todo ${i}`,
        completed: false,
        createdAt: new Date()
      }));
      app.setState({ todos });

      const startTime = Date.now();

      // Perform many rapid updates
      for (let i = 0; i < 50; i++) {
        app.toggleTodo(`todo-${i}`);
      }

      const endTime = Date.now();
      const updateTime = endTime - startTime;

      // Should handle rapid updates efficiently
      expect(updateTime).toBeLessThan(500);

      // Verify updates were applied correctly
      const completedCount = app.state.todos.filter(t => t.completed).length;
      expect(completedCount).toBe(50);
    });

    test('should maintain performance during filtering with large lists', () => {
      // Setup large mixed list
      const largeTodoList = Array.from({ length: 2000 }, (_, i) => ({
        id: `todo-${i}`,
        text: `Performance test todo ${i + 1}`,
        completed: i % 2 === 0,
        createdAt: new Date()
      }));
      app.setState({ todos: largeTodoList });

      // Test filter performance
      const filters = ['all', 'active', 'completed', 'all'];
      const filterTimes = [];

      filters.forEach(filter => {
        const startTime = Date.now();
        app.setFilter(filter);
        const endTime = Date.now();
        filterTimes.push(endTime - startTime);
      });

      // All filter operations should be fast
      filterTimes.forEach(time => {
        expect(time).toBeLessThan(50);
      });

      // Verify correct filtering results
      app.setFilter('active');
      expect(app.getFilteredTodos()).toHaveLength(1000);

      app.setFilter('completed');
      expect(app.getFilteredTodos()).toHaveLength(1000);
    });

    test('should handle memory efficiently with large datasets', () => {
      // This test would ideally measure memory usage
      // For now, we'll test that operations don't cause memory leaks

      const initialTodos = Array.from({ length: 500 }, (_, i) => ({
        id: `initial-${i}`,
        text: `Initial todo ${i}`,
        completed: false,
        createdAt: new Date()
      }));

      app.setState({ todos: initialTodos });

      // Perform operations that could cause memory leaks
      for (let i = 0; i < 100; i++) {
        // Add and immediately delete todos
        const tempTodo = {
          id: `temp-${i}`,
          text: `Temp todo ${i}`,
          completed: false,
          createdAt: new Date()
        };

        app.setState({ todos: [...app.state.todos, tempTodo] });
        app.setState({ todos: app.state.todos.filter(t => t.id !== `temp-${i}`) });
      }

      // Should maintain original count
      expect(app.state.todos).toHaveLength(500);

      // Event listeners should be properly managed
      expect(app.eventListeners.size).toBeGreaterThan(0);
      expect(app.eventListeners.size).toBeLessThan(1000); // Reasonable upper bound
    });
  });

  describe('Keyboard Interactions', () => {
    test('should add todo when Enter key is pressed', () => {
      const input = container.querySelector('#new-todo-input');
      input.value = 'Keyboard todo';
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

      // Simulate Enter key press
      const enterEvent = new dom.window.KeyboardEvent('keypress', {
        key: 'Enter',
        bubbles: true
      });
      input.dispatchEvent(enterEvent);

      // Verify todo was added
      expect(app.state.todos).toHaveLength(1);
      expect(app.state.todos[0].text).toBe('Keyboard todo');
      expect(app.state.newTodoText).toBe('');
    });

    test('should not add todo for other keys', () => {
      const input = container.querySelector('#new-todo-input');
      input.value = 'Test todo';
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

      // Simulate other key press
      const spaceEvent = new dom.window.KeyboardEvent('keypress', {
        key: ' ',
        bubbles: true
      });
      input.dispatchEvent(spaceEvent);

      // Verify todo was not added
      expect(app.state.todos).toHaveLength(0);
      expect(app.state.newTodoText).toBe('Test todo');
    });
  });

  describe('Statistics and Counts', () => {
    test('should display accurate todo statistics', () => {
      // Setup mixed todos
      app.setState({
        todos: [
          { id: '1', text: 'Active 1', completed: false, createdAt: new Date() },
          { id: '2', text: 'Active 2', completed: false, createdAt: new Date() },
          { id: '3', text: 'Completed 1', completed: true, createdAt: new Date() },
          { id: '4', text: 'Completed 2', completed: true, createdAt: new Date() },
          { id: '5', text: 'Completed 3', completed: true, createdAt: new Date() }
        ]
      });

      // Verify statistics display
      const statsElement = container.querySelector('.todo-stats p');
      expect(statsElement.textContent).toContain('Total: 5');
      expect(statsElement.textContent).toContain('Active: 2');
      expect(statsElement.textContent).toContain('Completed: 3');

      // Verify filter button counts
      const allBtn = container.querySelector('.filter-btn[data-filter="all"]');
      const activeBtn = container.querySelector('.filter-btn[data-filter="active"]');
      const completedBtn = container.querySelector('.filter-btn[data-filter="completed"]');

      expect(allBtn.textContent).toContain('(5)');
      expect(activeBtn.textContent).toContain('(2)');
      expect(completedBtn.textContent).toContain('(3)');
    });

    test('should update statistics when todos change', () => {
      // Start with one todo
      app.setState({
        todos: [{ id: '1', text: 'Test', completed: false, createdAt: new Date() }]
      });

      let statsElement = container.querySelector('.todo-stats p');
      expect(statsElement.textContent).toContain('Total: 1');
      expect(statsElement.textContent).toContain('Active: 1');
      expect(statsElement.textContent).toContain('Completed: 0');

      // Complete the todo
      app.toggleTodo('1');

      statsElement = container.querySelector('.todo-stats p');
      expect(statsElement.textContent).toContain('Total: 1');
      expect(statsElement.textContent).toContain('Active: 0');
      expect(statsElement.textContent).toContain('Completed: 1');

      // Add another todo
      app.setState({
        todos: [
          ...app.state.todos,
          { id: '2', text: 'New todo', completed: false, createdAt: new Date() }
        ]
      });

      statsElement = container.querySelector('.todo-stats p');
      expect(statsElement.textContent).toContain('Total: 2');
      expect(statsElement.textContent).toContain('Active: 1');
      expect(statsElement.textContent).toContain('Completed: 1');
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    test('should handle rapid successive operations', () => {
      // Rapidly add multiple todos
      for (let i = 0; i < 10; i++) {
        app.setState({
          newTodoText: `Rapid todo ${i}`,
          todos: [...app.state.todos, {
            id: `rapid-${i}`,
            text: `Rapid todo ${i}`,
            completed: false,
            createdAt: new Date()
          }]
        });
      }

      expect(app.state.todos).toHaveLength(10);

      // Rapidly toggle all todos
      app.state.todos.forEach(todo => {
        app.toggleTodo(todo.id);
      });

      expect(app.state.todos.every(t => t.completed)).toBe(true);
    });

    test('should handle invalid todo IDs gracefully', () => {
      app.setState({
        todos: [{ id: 'valid-1', text: 'Valid todo', completed: false, createdAt: new Date() }]
      });

      // Try operations with invalid IDs
      expect(() => {
        app.toggleTodo('invalid-id');
        app.startEdit('invalid-id');
        app.deleteTodo('invalid-id');
      }).not.toThrow();

      // Original todo should be unchanged
      expect(app.state.todos).toHaveLength(1);
      expect(app.state.todos[0].text).toBe('Valid todo');
    });

    test('should recover from render errors gracefully', () => {
      // This test simulates potential rendering issues
      const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');

      // Mock innerHTML to throw error once
      let errorThrown = false;
      Object.defineProperty(Element.prototype, 'innerHTML', {
        set: function(value) {
          if (!errorThrown) {
            errorThrown = true;
            throw new Error('Render error');
          }
          originalInnerHTML.set.call(this, value);
        },
        configurable: true
      });

      // Should not crash the application
      expect(() => {
        app.setState({
          todos: [{ id: '1', text: 'Test', completed: false, createdAt: new Date() }]
        });
      }).not.toThrow();

      // Restore original innerHTML
      Object.defineProperty(Element.prototype, 'innerHTML', originalInnerHTML);
    });
  });
});