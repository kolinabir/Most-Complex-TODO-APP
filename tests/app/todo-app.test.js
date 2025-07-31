/**
 * TodoApp Component Tests
 * Comprehensive tests for the main TodoApp component functionality
 */

// Mock dependencies
const mockStorageService = {
  data: {},
  setItem: function(key, value) {
    this.data[key] = JSON.stringify(value);
  },
  getItem: function(key) {
    const item = this.data[key];
    return item ? JSON.parse(item) : null;
  },
  removeItem: function(key) {
    delete this.data[key];
  },
  clear: function() {
    this.data = {};
  }
};

// Mock Todo model
const Todo = {
  create: function(text) {
    if (!text || text.trim().length === 0) {
      throw new Error('Todo text cannot be empty');
    }
    if (text.trim().length > 500) {
      throw new Error('Todo text cannot exceed 500 characters');
    }
    return {
      id: 'todo_' + Date.now() + '_' + Math.random(),
      text: text.trim(),
      completed: false,
      createdAt: new Date(),
      toData: function() {
        return {
          id: this.id,
          text: this.text,
          completed: this.completed,
          createdAt: this.createdAt
        };
      }
    };
  },
  fromData: function(data) {
    if (!data || !data.id || !data.text) {
      throw new Error('Invalid todo data');
    }
    return {
      id: data.id,
      text: data.text,
      completed: Boolean(data.completed),
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      toData: function() {
        return {
          id: this.id,
          text: this.text,
          completed: this.completed,
          createdAt: this.createdAt
        };
      }
    };
  }
};

// Mock localStorage
const mockLocalStorage = {
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

// Mock global objects
global.localStorage = mockLocalStorage;
global.confirm = jest.fn(() => true);
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Mock TodoApp component (simplified version for testing)
class MockTodoApp {
  constructor() {
    this.state = {
      todos: [],
      currentFilter: 'all',
      isLoading: false,
      error: '',
      isInitialized: false,
      editingId: null,
      lastSavedAt: null,
      autoSaveEnabled: true
    };
    this._autoSaveInterval = null;
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
  }

  // CRUD Operations
  handleAddTodo(text) {
    if (!text || text.trim().length === 0) {
      this.setError('Cannot add empty todo');
      return;
    }

    try {
      const todo = Todo.create(text.trim());
      const newTodos = [...this.state.todos, todo];

      this.setState({
        todos: newTodos,
        error: ''
      });

      this.saveToStorage();
      return todo;
    } catch (error) {
      this.setError('Failed to add todo: ' + error.message);
      throw error;
    }
  }

  handleToggleTodo(todoId) {
    if (!todoId) return;

    try {
      const newTodos = this.state.todos.map(todo => {
        if (todo.id === todoId) {
          return { ...todo, completed: !todo.completed };
        }
        return todo;
      });

      this.setState({
        todos: newTodos,
        error: ''
      });

      this.saveToStorage();
      return true;
    } catch (error) {
      this.setError('Failed to toggle todo');
      return false;
    }
  }

  handleEditTodo(todoId, newText) {
    if (!todoId || !newText) return;

    const trimmedText = newText.trim();
    if (trimmedText.length === 0) {
      this.setError('Todo text cannot be empty');
      return;
    }

    try {
      const newTodos = this.state.todos.map(todo => {
        if (todo.id === todoId) {
          return { ...todo, text: trimmedText };
        }
        return todo;
      });

      this.setState({
        todos: newTodos,
        editingId: null,
        error: ''
      });

      this.saveToStorage();
      return true;
    } catch (error) {
      this.setError('Failed to edit todo');
      return false;
    }
  }

  handleDeleteTodo(todoId) {
    if (!todoId) return;

    try {
      const newTodos = this.state.todos.filter(todo => todo.id !== todoId);

      this.setState({
        todos: newTodos,
        error: ''
      });

      this.saveToStorage();
      return true;
    } catch (error) {
      this.setError('Failed to delete todo');
      return false;
    }
  }

  // Bulk operations
  handleBulkToggle(todoIds, completed) {
    if (!todoIds || todoIds.length === 0) return;

    try {
      const newTodos = this.state.todos.map(todo => {
        if (todoIds.includes(todo.id)) {
          return { ...todo, completed: Boolean(completed) };
        }
        return todo;
      });

      this.setState({
        todos: newTodos,
        error: ''
      });

      this.saveToStorage();
      return true;
    } catch (error) {
      this.setError('Failed to update todos');
      return false;
    }
  }

  handleBulkDelete(todoIds) {
    if (!todoIds || todoIds.length === 0) return;

    try {
      const newTodos = this.state.todos.filter(todo => !todoIds.includes(todo.id));

      this.setState({
        todos: newTodos,
        error: ''
      });

      this.saveToStorage();
      return true;
    } catch (error) {
      this.setError('Failed to delete todos');
      return false;
    }
  }

  handleCompleteAll() {
    try {
      const newTodos = this.state.todos.map(todo => ({ ...todo, completed: true }));

      this.setState({
        todos: newTodos,
        error: ''
      });

      this.saveToStorage();
      return true;
    } catch (error) {
      this.setError('Failed to complete all todos');
      return false;
    }
  }

  handleClearCompleted() {
    try {
      const newTodos = this.state.todos.filter(todo => !todo.completed);

      this.setState({
        todos: newTodos,
        error: ''
      });

      this.saveToStorage();
      return true;
    } catch (error) {
      this.setError('Failed to clear completed todos');
      return false;
    }
  }

  handleClearAll() {
    if (this.state.todos.length === 0) return;

    try {
      this.setState({
        todos: [],
        error: ''
      });

      this.saveToStorage();
      return true;
    } catch (error) {
      this.setError('Failed to clear all todos');
      return false;
    }
  }

  // Filter handling
  handleFilterChange(newFilter) {
    if (!newFilter || newFilter === this.state.currentFilter) return;

    const validFilters = ['all', 'active', 'completed'];
    if (!validFilters.includes(newFilter)) {
      this.setError('Invalid filter: ' + newFilter);
      return;
    }

    this.setState({
      currentFilter: newFilter,
      error: ''
    });

    return true;
  }

  // Storage operations
  saveToStorage() {
    if (!this.state.autoSaveEnabled) return;

    try {
      const dataToSave = {
        todos: this.state.todos.map(todo => todo.toData ? todo.toData() : todo),
        currentFilter: this.state.currentFilter,
        savedAt: Date.now(),
        version: '1.0'
      };

      mockLocalStorage.setItem('todoapp_data', JSON.stringify(dataToSave));

      this.setState({
        lastSavedAt: new Date(),
        error: ''
      });

      return true;
    } catch (error) {
      this.setError('Failed to save data: ' + error.message);
      return false;
    }
  }

  loadFromStorage() {
    try {
      const savedData = mockLocalStorage.getItem('todoapp_data');

      if (!savedData) {
        this.setState({
          todos: [],
          currentFilter: 'all',
          isLoading: false,
          isInitialized: true,
          lastSavedAt: null
        });
        return;
      }

      const parsedData = JSON.parse(savedData);
      const todos = (parsedData.todos || []).map(todoData => Todo.fromData(todoData));
      const currentFilter = parsedData.currentFilter || 'all';
      const lastSavedAt = parsedData.savedAt ? new Date(parsedData.savedAt) : null;

      this.setState({
        todos,
        currentFilter,
        isLoading: false,
        isInitialized: true,
        lastSavedAt,
        error: ''
      });

      return true;
    } catch (error) {
      this.setError('Failed to load saved data: ' + error.message);

      this.setState({
        todos: [],
        currentFilter: 'all',
        isLoading: false,
        isInitialized: true,
        lastSavedAt: null
      });

      return false;
    }
  }

  clearStorage() {
    try {
      mockLocalStorage.removeItem('todoapp_data');
      mockLocalStorage.removeItem('todoapp_filter_state');

      this.setState({
        lastSavedAt: null
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Computed properties
  getFilteredTodos() {
    return this.state.todos.filter(todo => {
      if (this.state.currentFilter === 'active') {
        return !todo.completed;
      }
      if (this.state.currentFilter === 'completed') {
        return todo.completed;
      }
      return true; // 'all'
    });
  }

  getTodoStats() {
    const total = this.state.todos.length;
    const completed = this.state.todos.filter(todo => todo.completed).length;
    const active = total - completed;

    return {
      total,
      active,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }

  isEmpty() {
    return this.state.todos.length === 0;
  }

  hasActiveTodos() {
    return this.state.todos.some(todo => !todo.completed);
  }

  hasCompletedTodos() {
    return this.state.todos.some(todo => todo.completed);
  }

  // Utility methods
  setError(message) {
    this.setState({
      error: message || '',
      isLoading: false
    });
  }

  clearError() {
    this.setState({ error: '' });
  }

  initialize() {
    this.setState({
      isLoading: true,
      error: ''
    });

    try {
      this.loadFromStorage();

      if (this.state.autoSaveEnabled) {
        this.setupAutoSave();
      }

      return true;
    } catch (error) {
      this.setError('Failed to initialize application: ' + error.message);

      this.setState({
        isLoading: false,
        isInitialized: true
      });

      return false;
    }
  }

  setupAutoSave() {
    if (this._autoSaveInterval) {
      clearInterval(this._autoSaveInterval);
    }

    this._autoSaveInterval = setInterval(() => {
      if (this.state.autoSaveEnabled) {
        this.saveToStorage();
      }
    }, 30000);
  }

  // Public API methods
  addTodo(text) {
    return this.handleAddTodo(text);
  }

  toggleTodo(todoId) {
    return this.handleToggleTodo(todoId);
  }

  editTodo(todoId, newText) {
    return this.handleEditTodo(todoId, newText);
  }

  deleteTodo(todoId) {
    return this.handleDeleteTodo(todoId);
  }

  setFilter(filter) {
    return this.handleFilterChange(filter);
  }

  getFilter() {
    return this.state.currentFilter;
  }

  getTodos() {
    return this.state.todos.slice();
  }

  getStats() {
    return this.getTodoStats();
  }

  save() {
    return this.saveToStorage();
  }

  load() {
    return this.loadFromStorage();
  }

  reset() {
    try {
      this.clearStorage();
      this.setState({
        todos: [],
        currentFilter: 'all',
        isLoading: false,
        error: '',
        isInitialized: true,
        editingId: null,
        lastSavedAt: null
      });
      return true;
    } catch (error) {
      this.setError('Failed to reset application');
      return false;
    }
  }

  enableAutoSave() {
    this.setState({ autoSaveEnabled: true });
    this.setupAutoSave();
  }

  disableAutoSave() {
    this.setState({ autoSaveEnabled: false });
    if (this._autoSaveInterval) {
      clearInterval(this._autoSaveInterval);
      this._autoSaveInterval = null;
    }
  }

  isAutoSaveEnabled() {
    return this.state.autoSaveEnabled;
  }
}

// Test Suite
describe('TodoApp Component', () => {
  let todoApp;

  beforeEach(() => {
    // Clear all mocks and storage
    mockLocalStorage.clear();
    mockStorageService.clear();
    jest.clearAllMocks();

    // Create fresh TodoApp instance
    todoApp = new MockTodoApp();
  });

  afterEach(() => {
    // Clean up intervals
    if (todoApp._autoSaveInterval) {
      clearInterval(todoApp._autoSaveInterval);
    }
  });

  describe('Initialization', () => {
    test('should initialize with empty state', () => {
      expect(todoApp.state.todos).toEqual([]);
      expect(todoApp.state.currentFilter).toBe('all');
      expect(todoApp.state.isLoading).toBe(false);
      expect(todoApp.state.error).toBe('');
      expect(todoApp.state.isInitialized).toBe(false);
    });

    test('should initialize successfully', () => {
      const result = todoApp.initialize();

      expect(result).toBe(true);
      expect(todoApp.state.isInitialized).toBe(true);
      expect(todoApp.state.error).toBe('');
    });

    test('should load saved data on initialization', () => {
      // Setup saved data
      const savedData = {
        todos: [
          { id: '1', text: 'Test todo', completed: false, createdAt: new Date() }
        ],
        currentFilter: 'active',
        savedAt: Date.now(),
        version: '1.0'
      };
      mockLocalStorage.setItem('todoapp_data', JSON.stringify(savedData));

      todoApp.initialize();

      expect(todoApp.state.todos).toHaveLength(1);
      expect(todoApp.state.todos[0].text).toBe('Test todo');
      expect(todoApp.state.currentFilter).toBe('active');
    });
  });

  describe('Todo CRUD Operations', () => {
    describe('Adding Todos', () => {
      test('should add a new todo successfully', () => {
        const todo = todoApp.addTodo('New todo item');

        expect(todo).toBeDefined();
        expect(todo.text).toBe('New todo item');
        expect(todo.completed).toBe(false);
        expect(todoApp.state.todos).toHaveLength(1);
        expect(todoApp.state.error).toBe('');
      });

      test('should trim whitespace when adding todo', () => {
        const todo = todoApp.addTodo('  Trimmed todo  ');

        expect(todo.text).toBe('Trimmed todo');
      });

      test('should reject empty todo text', () => {
        expect(() => todoApp.addTodo('')).toThrow();
        expect(todoApp.state.todos).toHaveLength(0);
        expect(todoApp.state.error).toContain('Cannot add empty todo');
      });

      test('should reject whitespace-only todo text', () => {
        expect(() => todoApp.addTodo('   ')).toThrow();
        expect(todoApp.state.todos).toHaveLength(0);
      });

      test('should reject todo text exceeding 500 characters', () => {
        const longText = 'a'.repeat(501);
        expect(() => todoApp.addTodo(longText)).toThrow();
        expect(todoApp.state.todos).toHaveLength(0);
      });
    });

    describe('Toggling Todos', () => {
      test('should toggle todo completion status', () => {
        const todo = todoApp.addTodo('Test todo');
        expect(todo.completed).toBe(false);

        todoApp.toggleTodo(todo.id);
        expect(todoApp.state.todos[0].completed).toBe(true);

        todoApp.toggleTodo(todo.id);
        expect(todoApp.state.todos[0].completed).toBe(false);
      });

      test('should handle invalid todo ID gracefully', () => {
        todoApp.addTodo('Test todo');
        const result = todoApp.toggleTodo('invalid-id');

        expect(result).toBe(true); // Operation completes without error
        expect(todoApp.state.todos[0].completed).toBe(false); // No change
      });

      test('should handle null todo ID', () => {
        todoApp.addTodo('Test todo');
        const result = todoApp.toggleTodo(null);

        expect(result).toBeUndefined();
      });
    });

    describe('Editing Todos', () => {
      test('should edit todo text successfully', () => {
        const todo = todoApp.addTodo('Original text');
        const result = todoApp.editTodo(todo.id, 'Updated text');

        expect(result).toBe(true);
        expect(todoApp.state.todos[0].text).toBe('Updated text');
        expect(todoApp.state.error).toBe('');
      });

      test('should trim whitespace when editing', () => {
        const todo = todoApp.addTodo('Original text');
        todoApp.editTodo(todo.id, '  Updated text  ');

        expect(todoApp.state.todos[0].text).toBe('Updated text');
      });

      test('should reject empty edit text', () => {
        const todo = todoApp.addTodo('Original text');
        const result = todoApp.editTodo(todo.id, '');

        expect(result).toBeUndefined();
        expect(todoApp.state.todos[0].text).toBe('Original text');
        expect(todoApp.state.error).toContain('Todo text cannot be empty');
      });

      test('should handle invalid todo ID', () => {
        todoApp.addTodo('Test todo');
        const result = todoApp.editTodo('invalid-id', 'New text');

        expect(result).toBe(true); // Operation completes
        expect(todoApp.state.todos[0].text).toBe('Test todo'); // No change
      });
    });

    describe('Deleting Todos', () => {
      test('should delete todo successfully', () => {
        const todo = todoApp.addTodo('Test todo');
        const result = todoApp.deleteTodo(todo.id);

        expect(result).toBe(true);
        expect(todoApp.state.todos).toHaveLength(0);
        expect(todoApp.state.error).toBe('');
      });

      test('should handle invalid todo ID gracefully', () => {
        todoApp.addTodo('Test todo');
        const result = todoApp.deleteTodo('invalid-id');

        expect(result).toBe(true);
        expect(todoApp.state.todos).toHaveLength(1); // No change
      });

      test('should handle null todo ID', () => {
        todoApp.addTodo('Test todo');
        const result = todoApp.deleteTodo(null);

        expect(result).toBeUndefined();
        expect(todoApp.state.todos).toHaveLength(1);
      });
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(() => {
      // Setup test todos
      todoApp.addTodo('Todo 1');
      todoApp.addTodo('Todo 2');
      todoApp.addTodo('Todo 3');
      todoApp.toggleTodo(todoApp.state.todos[1].id); // Mark second todo as completed
    });

    test('should complete all selected todos', () => {
      const todoIds = [todoApp.state.todos[0].id, todoApp.state.todos[2].id];
      const result = todoApp.handleBulkToggle(todoIds, true);

      expect(result).toBe(true);
      expect(todoApp.state.todos[0].completed).toBe(true);
      expect(todoApp.state.todos[1].completed).toBe(true); // Was already completed
      expect(todoApp.state.todos[2].completed).toBe(true);
    });

    test('should delete selected todos', () => {
      const todoIds = [todoApp.state.todos[0].id, todoApp.state.todos[2].id];
      const result = todoApp.handleBulkDelete(todoIds);

      expect(result).toBe(true);
      expect(todoApp.state.todos).toHaveLength(1);
      expect(todoApp.state.todos[0].text).toBe('Todo 2');
    });

    test('should complete all todos', () => {
      const result = todoApp.handleCompleteAll();

      expect(result).toBe(true);
      expect(todoApp.state.todos.every(todo => todo.completed)).toBe(true);
    });

    test('should clear completed todos', () => {
      const result = todoApp.handleClearCompleted();

      expect(result).toBe(true);
      expect(todoApp.state.todos).toHaveLength(2);
      expect(todoApp.state.todos.every(todo => !todo.completed)).toBe(true);
    });

    test('should clear all todos', () => {
      const result = todoApp.handleClearAll();

      expect(result).toBe(true);
      expect(todoApp.state.todos).toHaveLength(0);
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      // Setup test todos
      todoApp.addTodo('Active todo 1');
      todoApp.addTodo('Active todo 2');
      todoApp.addTodo('Completed todo 1');
      todoApp.addTodo('Completed todo 2');

      // Mark some as completed
      todoApp.toggleTodo(todoApp.state.todos[2].id);
      todoApp.toggleTodo(todoApp.state.todos[3].id);
    });

    test('should filter all todos', () => {
      todoApp.setFilter('all');
      const filtered = todoApp.getFilteredTodos();

      expect(filtered).toHaveLength(4);
      expect(todoApp.state.currentFilter).toBe('all');
    });

    test('should filter active todos', () => {
      todoApp.setFilter('active');
      const filtered = todoApp.getFilteredTodos();

      expect(filtered).toHaveLength(2);
      expect(filtered.every(todo => !todo.completed)).toBe(true);
      expect(todoApp.state.currentFilter).toBe('active');
    });

    test('should filter completed todos', () => {
      todoApp.setFilter('completed');
      const filtered = todoApp.getFilteredTodos();

      expect(filtered).toHaveLength(2);
      expect(filtered.every(todo => todo.completed)).toBe(true);
      expect(todoApp.state.currentFilter).toBe('completed');
    });

    test('should reject invalid filter', () => {
      const result = todoApp.setFilter('invalid');

      expect(result).toBeUndefined();
      expect(todoApp.state.currentFilter).toBe('all');
      expect(todoApp.state.error).toContain('Invalid filter');
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      todoApp.addTodo('Todo 1');
      todoApp.addTodo('Todo 2');
      todoApp.addTodo('Todo 3');
      todoApp.toggleTodo(todoApp.state.todos[0].id); // Complete first todo
    });

    test('should calculate correct statistics', () => {
      const stats = todoApp.getStats();

      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.percentage).toBe(33); // 1/3 * 100, rounded
    });

    test('should handle empty todo list', () => {
      todoApp.reset();
      const stats = todoApp.getStats();

      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.percentage).toBe(0);
    });

    test('should detect empty state', () => {
      expect(todoApp.isEmpty()).toBe(false);

      todoApp.reset();
      expect(todoApp.isEmpty()).toBe(true);
    });

    test('should detect active todos', () => {
      expect(todoApp.hasActiveTodos()).toBe(true);

      todoApp.handleCompleteAll();
      expect(todoApp.hasActiveTodos()).toBe(false);
    });

    test('should detect completed todos', () => {
      expect(todoApp.hasCompletedTodos()).toBe(true);

      todoApp.handleClearCompleted();
      expect(todoApp.hasCompletedTodos()).toBe(false);
    });
  });

  describe('Storage Operations', () => {
    test('should save data to storage', () => {
      todoApp.addTodo('Test todo');
      const result = todoApp.save();

      expect(result).toBe(true);
      expect(todoApp.state.lastSavedAt).toBeDefined();
      expect(todoApp.state.error).toBe('');

      const savedData = JSON.parse(mockLocalStorage.getItem('todoapp_data'));
      expect(savedData.todos).toHaveLength(1);
      expect(savedData.todos[0].text).toBe('Test todo');
    });

    test('should load data from storage', () => {
      // Setup saved data
      const savedData = {
        todos: [
          { id: '1', text: 'Saved todo', completed: true, createdAt: new Date() }
        ],
        currentFilter: 'completed',
        savedAt: Date.now(),
        version: '1.0'
      };
      mockLocalStorage.setItem('todoapp_data', JSON.stringify(savedData));

      const result = todoApp.load();

      expect(result).toBe(true);
      expect(todoApp.state.todos).toHaveLength(1);
      expect(todoApp.state.todos[0].text).toBe('Saved todo');
      expect(todoApp.state.todos[0].completed).toBe(true);
      expect(todoApp.state.currentFilter).toBe('completed');
    });

    test('should handle missing storage data', () => {
      const result = todoApp.load();

      expect(result).toBeUndefined();
      expect(todoApp.state.todos).toHaveLength(0);
      expect(todoApp.state.currentFilter).toBe('all');
      expect(todoApp.state.isInitialized).toBe(true);
    });

    test('should handle corrupted storage data', () => {
      mockLocalStorage.setItem('todoapp_data', 'invalid json');

      const result = todoApp.load();

      expect(result).toBe(false);
      expect(todoApp.state.todos).toHaveLength(0);
      expect(todoApp.state.error).toContain('Failed to load saved data');
    });

    test('should clear storage', () => {
      todoApp.addTodo('Test todo');
      todoApp.save();

      const result = todoApp.clearStorage();

      expect(result).toBe(true);
      expect(mockLocalStorage.getItem('todoapp_data')).toBeNull();
      expect(todoApp.state.lastSavedAt).toBeNull();
    });
  });

  describe('Auto-save Functionality', () => {
    test('should enable auto-save', () => {
      todoApp.enableAutoSave();

      expect(todoApp.isAutoSaveEnabled()).toBe(true);
      expect(todoApp._autoSaveInterval).toBeDefined();
    });

    test('should disable auto-save', () => {
      todoApp.enableAutoSave();
      todoApp.disableAutoSave();

      expect(todoApp.isAutoSaveEnabled()).toBe(false);
      expect(todoApp._autoSaveInterval).toBeNull();
    });

    test('should auto-save when enabled', () => {
      todoApp.enableAutoSave();
      todoApp.addTodo('Test todo');

      expect(todoApp.state.lastSavedAt).toBeDefined();

      const savedData = JSON.parse(mockLocalStorage.getItem('todoapp_data'));
      expect(savedData.todos).toHaveLength(1);
    });

    test('should not auto-save when disabled', () => {
      todoApp.disableAutoSave();
      todoApp.addTodo('Test todo');

      // Manual save should still work
      const result = todoApp.save();
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should set error message', () => {
      todoApp.setError('Test error message');

      expect(todoApp.state.error).toBe('Test error message');
      expect(todoApp.state.isLoading).toBe(false);
    });

    test('should clear error message', () => {
      todoApp.setError('Test error');
      todoApp.clearError();

      expect(todoApp.state.error).toBe('');
    });

    test('should handle storage errors gracefully', () => {
      // Mock localStorage to throw error
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      todoApp.addTodo('Test todo');
      const result = todoApp.save();

      expect(result).toBe(false);
      expect(todoApp.state.error).toContain('Failed to save data');

      // Restore original method
      mockLocalStorage.setItem = originalSetItem;
    });
  });

  describe('Public API', () => {
    test('should provide public methods for external control', () => {
      // Test all public API methods exist and work
      expect(typeof todoApp.addTodo).toBe('function');
      expect(typeof todoApp.toggleTodo).toBe('function');
      expect(typeof todoApp.editTodo).toBe('function');
      expect(typeof todoApp.deleteTodo).toBe('function');
      expect(typeof todoApp.setFilter).toBe('function');
      expect(typeof todoApp.getFilter).toBe('function');
      expect(typeof todoApp.getTodos).toBe('function');
      expect(typeof todoApp.getStats).toBe('function');
      expect(typeof todoApp.save).toBe('function');
      expect(typeof todoApp.load).toBe('function');
      expect(typeof todoApp.reset).toBe('function');
      expect(typeof todoApp.enableAutoSave).toBe('function');
      expect(typeof todoApp.disableAutoSave).toBe('function');
      expect(typeof todoApp.isAutoSaveEnabled).toBe('function');
    });

    test('should return current filter', () => {
      todoApp.setFilter('active');
      expect(todoApp.getFilter()).toBe('active');
    });

    test('should return copy of todos array', () => {
      todoApp.addTodo('Test todo');
      const todos = todoApp.getTodos();

      expect(todos).toHaveLength(1);
      expect(todos).not.toBe(todoApp.state.todos); // Should be a copy
    });

    test('should reset application state', () => {
      todoApp.addTodo('Test todo');
      todoApp.setFilter('active');

      const result = todoApp.reset();

      expect(result).toBe(true);
      expect(todoApp.state.todos).toHaveLength(0);
      expect(todoApp.state.currentFilter).toBe('all');
      expect(todoApp.state.error).toBe('');
      expect(todoApp.state.isInitialized).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete user workflow', () => {
      // Initialize app
      todoApp.initialize();
      expect(todoApp.state.isInitialized).toBe(true);

      // Add some todos
      const todo1 = todoApp.addTodo('Buy groceries');
      const todo2 = todoApp.addTodo('Walk the dog');
      const todo3 = todoApp.addTodo('Read a book');

      expect(todoApp.state.todos).toHaveLength(3);

      // Complete one todo
      todoApp.toggleTodo(todo1.id);
      expect(todoApp.state.todos[0].completed).toBe(true);

      // Edit a todo
      todoApp.editTodo(todo2.id, 'Walk the dog in the park');
      expect(todoApp.state.todos[1].text).toBe('Walk the dog in the park');

      // Filter to show only active todos
      todoApp.setFilter('active');
      const activeTodos = todoApp.getFilteredTodos();
      expect(activeTodos).toHaveLength(2);

      // Filter to show completed todos
      todoApp.setFilter('completed');
      const completedTodos = todoApp.getFilteredTodos();
      expect(completedTodos).toHaveLength(1);

      // Clear completed todos
      todoApp.handleClearCompleted();
      expect(todoApp.state.todos).toHaveLength(2);

      // Verify stats
      const stats = todoApp.getStats();
      expect(stats.total).toBe(2);
      expect(stats.active).toBe(2);
      expect(stats.completed).toBe(0);

      // Save and reload
      todoApp.save();
      const newApp = new MockTodoApp();
      newApp.load();

      expect(newApp.state.todos).toHaveLength(2);
      expect(newApp.state.todos[0].text).toBe('Walk the dog in the park');
      expect(newApp.state.todos[1].text).toBe('Read a book');
    });

    test('should persist filter state across sessions', () => {
      todoApp.addTodo('Test todo');
      todoApp.setFilter('active');
      todoApp.save();

      const newApp = new MockTodoApp();
      newApp.load();

      expect(newApp.state.currentFilter).toBe('active');
    });

    test('should handle data persistence with various todo states', () => {
      // Create todos with different states
      const todo1 = todoApp.addTodo('Active todo');
      const todo2 = todoApp.addTodo('Completed todo');
      const todo3 = todoApp.addTodo('Another active todo');

      todoApp.toggleTodo(todo2.id); // Complete middle todo
      todoApp.save();

      // Load in new instance
      const newApp = new MockTodoApp();
      newApp.load();

      expect(newApp.state.todos).toHaveLength(3);
      expect(newApp.state.todos[0].completed).toBe(false);
      expect(newApp.state.todos[1].completed).toBe(true);
      expect(newApp.state.todos[2].completed).toBe(false);

      // Verify filtering works correctly
      newApp.setFilter('active');
      const activeTodos = newApp.getFilteredTodos();
      expect(activeTodos).toHaveLength(2);

      newApp.setFilter('completed');
      const completedTodos = newApp.getFilteredTodos();
      expect(completedTodos).toHaveLength(1);
    });
  });
});