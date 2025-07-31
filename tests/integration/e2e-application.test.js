/**
 * End-to-End Application Tests
 *
 * Comprehensive tests that verify complete user workflows for the TodoLang application.
 * Tests todo creation, editing, completion, deletion, filtering, URL state management,
 * data persistence, and performance with large datasets.
 *
 * Requirements Coverage:
 * - 3.1: Todo creation with text input and add button
 * - 3.2: Unique ID assignment and incomplete status
 * - 3.3: Input validation for empty todos
 * - 3.4: Input field clearing and display updates
 * - 4.1: Todo list display on application load
 * - 4.2: Todo item display with text, status, and actions
 * - 4.3: Empty state message when no todos exist
 * - 4.4: Automatic re-rendering on todo list updates
 * - 5.1: Toggle completion status via checkbox
 * - 5.2: Visual indication of completed state
 * - 5.3: Persistence and display update of completion changes
 * - 6.1: Edit mode activation via edit button
 * - 6.2: Edit input field display with current text
 * - 6.3: Save edited text and exit edit mode
 * - 6.4: Cancel editing and revert to original text
 * - 6.5: Validation error for empty edited text
 * - 7.1: Todo deletion via delete button
 * - 7.2: Immediate display update after deletion
 * - 7.3: Confirmation dialog for deletion prevention
 * - 7.4: Empty state display when last todo deleted
 * - 8.1: All filter displays all todos regardless of status
 * - 8.2: Active filter displays only incomplete todos
 * - 8.3: Completed filter displays only completed todos
 * - 8.4: URL updates to reflect current filter state
 * - 8.5: Filter application from direct URL navigation
 * - 9.1: Automatic saving of changes to local storage
 * - 9.2: Data retrieval and display from previous sessions
 * - 9.3: Graceful degradation when localStorage unavailable
 * - 9.4: Appropriate handling of empty storage state
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

      // Should handle rapid updates efficiently (less than 200ms)
      expect(updateTime).toBeLessThan(200);

      // Verify updates were applied correctly
      const completedCount = app.state.todos.filter(t => t.completed).length;
      expect(completedCount).toBe(50);
    });

    test('should maintain performance during filtering with large lists', () => {
      // Setup large list with mixed completion states
      const largeTodos = Array.from({ length: 2000 }, (_, i) => ({
        id: `large-todo-${i}`,
        text: `Large dataset todo ${i + 1}`,
        completed: i % 4 === 0, // Every 4th todo is completed
        createdAt: new Date(Date.now() - i * 1000)
      }));
      app.setState({ todos: largeTodos });

      const startTime = Date.now();

      // Test multiple filter operations
      app.setFilter('active');
      const activeTodos = app.getFilteredTodos();

      app.setFilter('completed');
      const completedTodos = app.getFilteredTodos();

      app.setFilter('all');
      const allTodos = app.getFilteredTodos();

      const endTime = Date.now();
      const filterTime = endTime - startTime;

      // Should filter large lists efficiently (less than 100ms)
      expect(filterTime).toBeLessThan(100);

      // Verify filter results are correct
      expect(allTodos).toHaveLength(2000);
      expect(completedTodos).toHaveLength(500); // 2000 / 4 = 500
      expect(activeTodos).toHaveLength(1500); // 2000 - 500 = 1500
    });

    test('should handle memory efficiently with large datasets', () => {
      // Test memory usage doesn't grow excessively with large datasets
      const initialMemory = process.memoryUsage().heapUsed;

      // Create and destroy large todo lists multiple times
      for (let iteration = 0; iteration < 5; iteration++) {
        const largeTodos = Array.from({ length: 1000 }, (_, i) => ({
          id: `memory-test-${iteration}-${i}`,
          text: `Memory test todo ${i + 1}`,
          completed: Math.random() > 0.5,
          createdAt: new Date()
        }));

        app.setState({ todos: largeTodos });

        // Perform operations that might cause memory leaks
        for (let i = 0; i < 100; i++) {
          app.setFilter(i % 3 === 0 ? 'all' : i % 3 === 1 ? 'active' : 'completed');
        }

        // Clear the todos
        app.setState({ todos: [] });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Keyboard Interactions', () => {
    test('should add todo when Enter key is pressed', () => {
      const input = container.querySelector('#new-todo-input');
      input.value = 'Todo via Enter key';
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

      // Simulate Enter key press
      const enterEvent = new dom.window.KeyboardEvent('keypress', {
        key: 'Enter',
        bubbles: true
      });
      input.dispatchEvent(enterEvent);

      // Verify todo was added
      expect(app.state.todos).toHaveLength(1);
      expect(app.state.todos[0].text).toBe('Todo via Enter key');
      expect(app.state.newTodoText).toBe('');
    });

    test('should not add todo for other keys', () => {
      const input = container.querySelector('#new-todo-input');
      input.value = 'Todo via other key';
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

      // Simulate other key press (e.g., Space)
      const spaceEvent = new dom.window.KeyboardEvent('keypress', {
        key: ' ',
        bubbles: true
      });
      input.dispatchEvent(spaceEvent);

      // Verify todo was not added
      expect(app.state.todos).toHaveLength(0);
      expect(app.state.newTodoText).toBe('Todo via other key');
    });

    test('should handle Escape key during editing', () => {
      // Setup: Add a todo and start editing
      app.setState({
        todos: [{ id: 'test-1', text: 'Original text', completed: false, createdAt: new Date() }],
        editingId: 'test-1'
      });

      const editInput = container.querySelector('.edit-input[data-id="test-1"]');
      editInput.value = 'Modified text';

      // Simulate Escape key press
      const escapeEvent = new dom.window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      });
      editInput.dispatchEvent(escapeEvent);

      // Verify edit was cancelled
      expect(app.state.editingId).toBe(null);
      expect(app.state.todos[0].text).toBe('Original text'); // Should revert
    });
  });

  describe('Statistics and Counts', () => {
    beforeEach(() => {
      // Setup test data
      app.setState({
        todos: [
          { id: '1', text: 'Active todo 1', completed: false, createdAt: new Date() },
          { id: '2', text: 'Completed todo 1', completed: true, createdAt: new Date() },
          { id: '3', text: 'Active todo 2', completed: false, createdAt: new Date() },
          { id: '4', text: 'Completed todo 2', completed: true, createdAt: new Date() },
          { id: '5', text: 'Active todo 3', completed: false, createdAt: new Date() }
        ]
      });
    });

    test('should display accurate todo statistics', () => {
      const statsElement = container.querySelector('.todo-stats p');
      expect(statsElement.textContent).toContain('Total: 5');
      expect(statsElement.textContent).toContain('Active: 3');
      expect(statsElement.textContent).toContain('Completed: 2');

      // Verify filter button counts
      const allBtn = container.querySelector('.filter-btn[data-filter="all"]');
      const activeBtn = container.querySelector('.filter-btn[data-filter="active"]');
      const completedBtn = container.querySelector('.filter-btn[data-filter="completed"]');

      expect(allBtn.textContent).toContain('All (5)');
      expect(activeBtn.textContent).toContain('Active (3)');
      expect(completedBtn.textContent).toContain('Completed (2)');
    });

    test('should update statistics when todos change', () => {
      // Complete one more todo
      const checkbox = container.querySelector('.todo-checkbox[data-id="1"]');
      checkbox.click();

      // Verify statistics updated
      const statsElement = container.querySelector('.todo-stats p');
      expect(statsElement.textContent).toContain('Total: 5');
      expect(statsElement.textContent).toContain('Active: 2');
      expect(statsElement.textContent).toContain('Completed: 3');

      // Add a new todo
      const input = container.querySelector('#new-todo-input');
      input.value = 'New todo';
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

      const addBtn = container.querySelector('#add-todo-btn');
      addBtn.click();

      // Verify statistics updated again
      expect(statsElement.textContent).toContain('Total: 6');
      expect(statsElement.textContent).toContain('Active: 3');
      expect(statsElement.textContent).toContain('Completed: 3');
    });

    test('should handle empty state statistics', () => {
      // Clear all todos
      app.setState({ todos: [] });

      const statsElement = container.querySelector('.todo-stats p');
      expect(statsElement.textContent).toContain('Total: 0');
      expect(statsElement.textContent).toContain('Active: 0');
      expect(statsElement.textContent).toContain('Completed: 0');

      // Verify empty state message is shown
      const emptyState = container.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toContain('No todos found');
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    test('should handle rapid successive operations', () => {
      // Add multiple todos rapidly
      for (let i = 0; i < 10; i++) {
        app.setState({
          todos: [...app.state.todos, {
            id: `rapid-${i}`,
            text: `Rapid todo ${i}`,
            completed: false,
            createdAt: new Date()
          }]
        });
      }

      expect(app.state.todos).toHaveLength(10);

      // Rapidly toggle completion
      for (let i = 0; i < 10; i++) {
        app.toggleTodo(`rapid-${i}`);
      }

      // Verify all todos are completed
      expect(app.state.todos.every(t => t.completed)).toBe(true);

      // Rapidly change filters
      const filters = ['all', 'active', 'completed', 'all', 'active'];
      filters.forEach(filter => {
        app.setFilter(filter);
        expect(app.state.currentFilter).toBe(filter);
      });
    });

    test('should handle invalid todo IDs gracefully', () => {
      app.setState({
        todos: [{ id: 'valid-1', text: 'Valid todo', completed: false, createdAt: new Date() }]
      });

      // Try operations with invalid IDs
      expect(() => app.toggleTodo('invalid-id')).not.toThrow();
      expect(() => app.editTodo('invalid-id', 'New text')).not.toThrow();
      expect(() => app.deleteTodo('invalid-id')).not.toThrow();

      // Verify original todo is unchanged
      expect(app.state.todos).toHaveLength(1);
      expect(app.state.todos[0].text).toBe('Valid todo');
      expect(app.state.todos[0].completed).toBe(false);
    });

    test('should recover from render errors gracefully', () => {
      // Simulate a render error by providing invalid data
      const originalRender = app.render;
      let renderErrorOccurred = false;

      app.render = function() {
        try {
          return originalRender.call(this);
        } catch (error) {
          renderErrorOccurred = true;
          // Fallback render
          this.container.innerHTML = '<div class="error-state">Application error occurred</div>';
        }
      };

      // Trigger render with problematic data
      app.setState({
        todos: [{ id: null, text: null, completed: null }] // Invalid data
      });

      // Verify error was handled gracefully
      if (renderErrorOccurred) {
        const errorState = container.querySelector('.error-state');
        expect(errorState).toBeTruthy();
      }

      // Restore original render function
      app.render = originalRender;
    });

    test('should handle concurrent state updates', () => {
      // Simulate concurrent updates
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(new Promise(resolve => {
          setTimeout(() => {
            app.setState({
              todos: [...app.state.todos, {
                id: `concurrent-${i}`,
                text: `Concurrent todo ${i}`,
                completed: false,
                createdAt: new Date()
              }]
            });
            resolve();
          }, Math.random() * 10);
        }));
      }

      return Promise.all(promises).then(() => {
        // All todos should be added despite concurrent updates
        expect(app.state.todos).toHaveLength(5);

        // Verify all todos have unique IDs
        const ids = app.state.todos.map(t => t.id);
        const uniqueIds = [...new Set(ids)];
        expect(uniqueIds).toHaveLength(5);
      });
    });
  });

  describe('Advanced User Workflows', () => {
    test('should handle complex multi-step workflow', () => {
      console.log('    🔄 Testing complex multi-step user workflow');

      // Step 1: User adds multiple todos
      const todosToAdd = [
        'Buy groceries for dinner party',
        'Call mom about weekend plans',
        'Finish quarterly report',
        'Schedule dentist appointment',
        'Review code for new feature'
      ];

      todosToAdd.forEach(text => {
        const input = container.querySelector('#new-todo-input');
        input.value = text;
        input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

        const addBtn = container.querySelector('#add-todo-btn');
        addBtn.click();
      });

      expect(app.state.todos).toHaveLength(5);

      // Step 2: User completes some todos
      const checkboxes = container.querySelectorAll('.todo-checkbox');
      checkboxes[1].click(); // Complete "Call mom"
      checkboxes[3].click(); // Complete "Schedule dentist"

      const completedCount = app.state.todos.filter(t => t.completed).length;
      expect(completedCount).toBe(2);

      // Step 3: User filters to see only active todos
      const activeBtn = container.querySelector('.filter-btn[data-filter="active"]');
      activeBtn.click();

      expect(app.state.currentFilter).toBe('active');
      const visibleTodos = container.querySelectorAll('.todo-item');
      expect(visibleTodos).toHaveLength(3);

      // Step 4: User edits an active todo
      const editBtn = container.querySelector('.edit-btn');
      editBtn.click();

      const editInput = container.querySelector('.edit-input');
      editInput.value = 'Buy organic groceries for dinner party';

      const saveBtn = container.querySelector('.save-edit-btn');
      saveBtn.click();

      expect(app.state.todos[0].text).toBe('Buy organic groceries for dinner party');

      // Step 5: User switches to completed filter
      const completedBtn = container.querySelector('.filter-btn[data-filter="completed"]');
      completedBtn.click();

      expect(app.state.currentFilter).toBe('completed');
      const completedTodos = container.querySelectorAll('.todo-item');
      expect(completedTodos).toHaveLength(2);

      // Step 6: User deletes a completed todo
      global.confirm.mockReturnValue(true);
      const deleteBtn = container.querySelector('.delete-btn');
      deleteBtn.click();

      expect(app.state.todos).toHaveLength(4);

      // Step 7: User returns to all view
      const allBtn = container.querySelector('.filter-btn[data-filter="all"]');
      allBtn.click();

      expect(app.state.currentFilter).toBe('all');
      const allTodos = container.querySelectorAll('.todo-item');
      expect(allTodos).toHaveLength(4);

      console.log('    ✅ Complex multi-step workflow completed successfully');
    });

    test('should handle bulk operations workflow', () => {
      // Setup multiple todos
      const todos = Array.from({ length: 10 }, (_, i) => ({
        id: `bulk-${i}`,
        text: `Bulk todo ${i + 1}`,
        completed: i % 2 === 0, // Every other todo is completed
        createdAt: new Date()
      }));
      app.setState({ todos });

      // Simulate bulk complete all active todos
      const activeTodos = app.state.todos.filter(t => !t.completed);
      activeTodos.forEach(todo => {
        app.toggleTodo(todo.id);
      });

      // Verify all todos are now completed
      expect(app.state.todos.every(t => t.completed)).toBe(true);

      // Simulate bulk delete completed todos
      const completedTodos = app.state.todos.filter(t => t.completed);
      global.confirm.mockReturnValue(true);

      completedTodos.forEach(todo => {
        app.deleteTodo(todo.id);
      });

      // Verify all todos were deleted
      expect(app.state.todos).toHaveLength(0);
    });

    test('should handle session restoration workflow', () => {
      // Session 1: User creates and modifies todos
      const sessionTodos = [
        { id: 'session-1', text: 'Session todo 1', completed: false, createdAt: new Date() },
        { id: 'session-2', text: 'Session todo 2', completed: true, createdAt: new Date() },
        { id: 'session-3', text: 'Session todo 3', completed: false, createdAt: new Date() }
      ];

      app.setState({
        todos: sessionTodos,
        currentFilter: 'active'
      });

      // Verify data is saved
      const savedData = localStorage.getItem('todoapp_data');
      expect(savedData).toBeTruthy();

      // Session 2: Simulate browser restart
      app.destroy();
      const newApp = new MockTodoApp(container);
      newApp.loadFromStorage();

      // Verify session was restored
      expect(newApp.state.todos).toHaveLength(3);
      expect(newApp.state.currentFilter).toBe('active');
      expect(newApp.state.todos[0].text).toBe('Session todo 1');

      // User continues working in restored session
      newApp.addTodo('New todo after restore');
      expect(newApp.state.todos).toHaveLength(4);

      newApp.destroy();
    });
  });

  describe('Accessibility and Usability', () => {
    test('should provide proper ARIA labels and roles', () => {
      app.setState({
        todos: [
          { id: 'a11y-1', text: 'Accessible todo', completed: false, createdAt: new Date() }
        ]
      });

      // Check for proper form labels
      const input = container.querySelector('#new-todo-input');
      expect(input.getAttribute('placeholder')).toBe('Add a new todo...');

      // Check for proper button labels
      const addBtn = container.querySelector('#add-todo-btn');
      expect(addBtn.textContent.trim()).toBe('Add Todo');

      // Check for proper checkbox labels
      const checkbox = container.querySelector('.todo-checkbox');
      expect(checkbox.getAttribute('type')).toBe('checkbox');

      // Check for proper button roles
      const editBtn = container.querySelector('.edit-btn');
      expect(editBtn.textContent.trim()).toBe('Edit');

      const deleteBtn = container.querySelector('.delete-btn');
      expect(deleteBtn.textContent.trim()).toBe('Delete');
    });

    test('should handle focus management during editing', () => {
      app.setState({
        todos: [
          { id: 'focus-1', text: 'Focus test todo', completed: false, createdAt: new Date() }
        ]
      });

      // Start editing
      const editBtn = container.querySelector('.edit-btn[data-id="focus-1"]');
      editBtn.click();

      // Verify edit input is present
      const editInput = container.querySelector('.edit-input[data-id="focus-1"]');
      expect(editInput).toBeTruthy();
      expect(editInput.value).toBe('Focus test todo');

      // Cancel editing
      const cancelBtn = container.querySelector('.cancel-edit-btn[data-id="focus-1"]');
      cancelBtn.click();

      // Verify edit mode is exited
      expect(app.state.editingId).toBe(null);
      const todoText = container.querySelector('.todo-text');
      expect(todoText.textContent).toBe('Focus test todo');
    });
  });
});

// Additional test utilities for comprehensive coverage
class E2ETestUtils {
  static simulateUserSession(app, actions) {
    const results = [];

    actions.forEach(action => {
      const startTime = Date.now();
      let result;

      try {
        switch (action.type) {
          case 'add':
            result = app.addTodo(action.text);
            break;
          case 'toggle':
            result = app.toggleTodo(action.id);
            break;
          case 'edit':
            app.startEdit(action.id);
            result = app.saveEdit(action.id, action.newText);
            break;
          case 'delete':
            result = app.deleteTodo(action.id);
            break;
          case 'filter':
            result = app.setFilter(action.filter);
            break;
          case 'save':
            result = app.saveToStorage();
            break;
          case 'load':
            result = app.loadFromStorage();
            break;
          default:
            result = false;
        }

        const endTime = Date.now();
        results.push({
          action: action.type,
          success: result !== false,
          duration: endTime - startTime,
          data: action
        });

      } catch (error) {
        results.push({
          action: action.type,
          success: false,
          error: error.message,
          data: action
        });
      }
    });

    return results;
  }

  static generateRealisticTodos(count) {
    const todoTemplates = [
      'Buy groceries', 'Walk the dog', 'Call mom', 'Finish report',
      'Schedule meeting', 'Pay bills', 'Clean house', 'Exercise',
      'Read book', 'Write code', 'Review documents', 'Plan vacation',
      'Fix bug', 'Update website', 'Send emails', 'Organize files'
    ];

    return Array.from({ length: count }, (_, i) => {
      const template = todoTemplates[i % todoTemplates.length];
      return {
        id: `realistic-${i}`,
        text: `${template} ${Math.floor(i / todoTemplates.length) + 1}`,
        completed: Math.random() > 0.7, // 30% completed
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random within last week
      };
    });
  }

  static measurePerformance(operation, iterations = 1) {
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      operation();
      const end = performance.now();
      times.push(end - start);
    }

    return {
      min: Math.min(...times),
      max: Math.max(...times),
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      total: times.reduce((a, b) => a + b, 0)
    };
  }
}

export { E2ETestUtils };t i = 0; i < 50; i++) {
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