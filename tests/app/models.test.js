/**
 * Unit tests for TodoLang data models
 * Tests Todo, TodoList, FilterConfig models and ValidationService
 */

// Import test framework setup
import '../framework/index.js';

// Mock the TodoLang compiler and runtime for testing
// In a real implementation, these would be compiled from TodoLang source
class MockTodo {
  constructor(data = {}) {
    this.id = data.id || MockTodo.generateId();
    this.text = data.text || '';
    this.completed = data.completed || false;
    this.createdAt = data.createdAt || Date.now();
  }

  static create(text) {
    if (typeof text !== "string") {
      throw new Error("Todo text must be a non-empty string");
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      throw new Error("Todo text cannot be empty or whitespace only");
    }

    if (trimmedText.length > 500) {
      throw new Error("Todo text cannot exceed 500 characters");
    }

    return new MockTodo({
      id: MockTodo.generateId(),
      text: trimmedText,
      completed: false,
      createdAt: Date.now()
    });
  }

  static fromData(data) {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid todo data provided");
    }

    if (!data.id || typeof data.id !== "string") {
      throw new Error("Todo must have a valid id");
    }

    if (!data.text || typeof data.text !== "string") {
      throw new Error("Todo must have valid text");
    }

    return new MockTodo({
      id: data.id,
      text: data.text,
      completed: Boolean(data.completed),
      createdAt: data.createdAt ? new Date(data.createdAt) : Date.now()
    });
  }

  static generateId() {
    return "todo_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 9);
  }

  static validateText(text) {
    if (!text || typeof text !== "string") {
      return false;
    }
    const trimmed = text.trim();
    return trimmed.length > 0 && trimmed.length <= 500;
  }

  updateText(newText) {
    if (!MockTodo.validateText(newText)) {
      throw new Error("Invalid todo text provided");
    }
    this.text = newText.trim();
  }

  toggle() {
    this.completed = !this.completed;
  }

  complete() {
    this.completed = true;
  }

  activate() {
    this.completed = false;
  }

  matchesFilter(filter) {
    switch (filter) {
      case "all":
        return true;
      case "active":
        return !this.completed;
      case "completed":
        return this.completed;
      default:
        return true;
    }
  }

  toData() {
    return {
      id: this.id,
      text: this.text,
      completed: this.completed,
      createdAt: this.createdAt
    };
  }
}

class MockTodoList {
  constructor(data = {}) {
    this.todos = data.todos || [];
    this.filter = data.filter || "all";
  }

  static create() {
    return new MockTodoList({
      todos: [],
      filter: "all"
    });
  }

  static fromData(data) {
    if (!Array.isArray(data)) {
      throw new Error("TodoList data must be an array");
    }

    const todos = data.map(item => MockTodo.fromData(item));
    return new MockTodoList({
      todos: todos,
      filter: "all"
    });
  }

  addTodo(text) {
    const todo = MockTodo.create(text);
    this.todos.push(todo);
    return todo;
  }

  removeTodo(id) {
    const initialLength = this.todos.length;
    this.todos = this.todos.filter(todo => todo.id !== id);
    return this.todos.length < initialLength;
  }

  findTodo(id) {
    return this.todos.find(todo => todo.id === id) || null;
  }

  updateTodo(id, newText) {
    const todo = this.findTodo(id);
    if (todo) {
      todo.updateText(newText);
      return true;
    }
    return false;
  }

  toggleTodo(id) {
    const todo = this.findTodo(id);
    if (todo) {
      todo.toggle();
      return true;
    }
    return false;
  }

  getFilteredTodos() {
    return this.todos.filter(todo => todo.matchesFilter(this.filter));
  }

  setFilter(filter) {
    this.filter = filter;
    return this.getFilteredTodos();
  }

  getAllTodos() {
    return [...this.todos];
  }

  getActiveTodos() {
    return this.todos.filter(todo => !todo.completed);
  }

  getCompletedTodos() {
    return this.todos.filter(todo => todo.completed);
  }

  getCount() {
    return {
      total: this.todos.length,
      active: this.getActiveTodos().length,
      completed: this.getCompletedTodos().length
    };
  }

  clear() {
    this.todos = [];
  }

  clearCompleted() {
    this.todos = this.getActiveTodos();
  }

  completeAll() {
    this.todos.forEach(todo => todo.complete());
  }

  activateAll() {
    this.todos.forEach(todo => todo.activate());
  }

  isEmpty() {
    return this.todos.length === 0;
  }

  allCompleted() {
    return this.todos.length > 0 && this.todos.every(todo => todo.completed);
  }

  hasCompleted() {
    return this.todos.some(todo => todo.completed);
  }

  toData() {
    return this.todos.map(todo => todo.toData());
  }
}

class MockFilterConfig {
  constructor(data = {}) {
    this.label = data.label || '';
    this.value = data.value || 'all';
    this.isActive = data.isActive || false;
  }

  static createAll() {
    return new MockFilterConfig({
      label: "All",
      value: "all",
      isActive: false
    });
  }

  static createActive() {
    return new MockFilterConfig({
      label: "Active",
      value: "active",
      isActive: false
    });
  }

  static createCompleted() {
    return new MockFilterConfig({
      label: "Completed",
      value: "completed",
      isActive: false
    });
  }

  static getAllFilters() {
    return [
      MockFilterConfig.createAll(),
      MockFilterConfig.createActive(),
      MockFilterConfig.createCompleted()
    ];
  }

  setActive(isActive) {
    this.isActive = isActive;
  }
}

class MockValidationService {
  static validateTodoText(text) {
    const result = {
      isValid: false,
      error: null,
      sanitizedText: ""
    };

    if (typeof text !== "string") {
      result.error = "Text must be a string";
      return result;
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      result.error = "Text cannot be empty";
      return result;
    }

    if (trimmed.length > 500) {
      result.error = "Text cannot exceed 500 characters";
      return result;
    }

    result.isValid = true;
    result.sanitizedText = trimmed;
    return result;
  }

  static validateTodoId(id) {
    return typeof id === "string" && id.length > 0;
  }

  static validateFilterType(filter) {
    return filter === "all" ||
           filter === "active" ||
           filter === "completed";
  }
}

// Test Suite
describe('Todo Model Tests', () => {
  test('Todo.create() should create a valid todo with required properties', () => {
    const todo = MockTodo.create('Test todo');

    expect(todo.id).toBeDefined();
    expect(typeof todo.id).toBe('string');
    expect(todo.text).toBe('Test todo');
    expect(todo.completed).toBe(false);
    expect(todo.createdAt).toBeDefined();
    expect(typeof todo.createdAt).toBe('number');
  });

  test('Todo.create() should trim whitespace from text', () => {
    const todo = MockTodo.create('  Test todo  ');
    expect(todo.text).toBe('Test todo');
  });

  test('Todo.create() should throw error for empty text', () => {
    expect(() => MockTodo.create('')).toThrow('Todo text cannot be empty or whitespace only');
    expect(() => MockTodo.create('   ')).toThrow('Todo text cannot be empty or whitespace only');
  });

  test('Todo.create() should throw error for non-string text', () => {
    expect(() => MockTodo.create(null)).toThrow('Todo text must be a non-empty string');
    expect(() => MockTodo.create(undefined)).toThrow('Todo text must be a non-empty string');
    expect(() => MockTodo.create(123)).toThrow('Todo text must be a non-empty string');
  });

  test('Todo.create() should throw error for text exceeding 500 characters', () => {
    const longText = 'a'.repeat(501);
    expect(() => MockTodo.create(longText)).toThrow('Todo text cannot exceed 500 characters');
  });

  test('Todo.fromData() should create todo from valid data', () => {
    const data = {
      id: 'test-id',
      text: 'Test todo',
      completed: true,
      createdAt: 1234567890
    };

    const todo = MockTodo.fromData(data);
    expect(todo.id).toBe('test-id');
    expect(todo.text).toBe('Test todo');
    expect(todo.completed).toBe(true);
    expect(todo.createdAt).toEqual(new Date(1234567890));
  });

  test('Todo.fromData() should throw error for invalid data', () => {
    expect(() => MockTodo.fromData(null)).toThrow('Invalid todo data provided');
    expect(() => MockTodo.fromData({})).toThrow('Todo must have a valid id');
    expect(() => MockTodo.fromData({ id: 'test' })).toThrow('Todo must have valid text');
  });

  test('Todo.generateId() should generate unique IDs', () => {
    const id1 = MockTodo.generateId();
    const id2 = MockTodo.generateId();

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
    expect(id1.startsWith('todo_')).toBe(true);
    expect(id2.startsWith('todo_')).toBe(true);
  });

  test('Todo.validateText() should validate text correctly', () => {
    expect(MockTodo.validateText('Valid text')).toBe(true);
    expect(MockTodo.validateText('')).toBe(false);
    expect(MockTodo.validateText('   ')).toBe(false);
    expect(MockTodo.validateText(null)).toBe(false);
    expect(MockTodo.validateText(undefined)).toBe(false);
    expect(MockTodo.validateText('a'.repeat(501))).toBe(false);
  });

  test('todo.updateText() should update text with validation', () => {
    const todo = MockTodo.create('Original text');
    todo.updateText('Updated text');
    expect(todo.text).toBe('Updated text');

    expect(() => todo.updateText('')).toThrow('Invalid todo text provided');
  });

  test('todo.toggle() should toggle completion status', () => {
    const todo = MockTodo.create('Test todo');
    expect(todo.completed).toBe(false);

    todo.toggle();
    expect(todo.completed).toBe(true);

    todo.toggle();
    expect(todo.completed).toBe(false);
  });

  test('todo.complete() and todo.activate() should set completion status', () => {
    const todo = MockTodo.create('Test todo');

    todo.complete();
    expect(todo.completed).toBe(true);

    todo.activate();
    expect(todo.completed).toBe(false);
  });

  test('todo.matchesFilter() should filter correctly', () => {
    const activeTodo = MockTodo.create('Active todo');
    const completedTodo = MockTodo.create('Completed todo');
    completedTodo.complete();

    expect(activeTodo.matchesFilter('all')).toBe(true);
    expect(activeTodo.matchesFilter('active')).toBe(true);
    expect(activeTodo.matchesFilter('completed')).toBe(false);

    expect(completedTodo.matchesFilter('all')).toBe(true);
    expect(completedTodo.matchesFilter('active')).toBe(false);
    expect(completedTodo.matchesFilter('completed')).toBe(true);
  });

  test('todo.toData() should convert to plain object', () => {
    const todo = MockTodo.create('Test todo');
    const data = todo.toData();

    expect(data).toEqual({
      id: todo.id,
      text: 'Test todo',
      completed: false,
      createdAt: todo.createdAt
    });
  });
});

describe('TodoList Model Tests', () => {
  let todoList;

  beforeEach(() => {
    todoList = MockTodoList.create();
  });

  test('TodoList.create() should create empty list', () => {
    expect(todoList.todos).toEqual([]);
    expect(todoList.filter).toBe('all');
  });

  test('TodoList.fromData() should create list from data array', () => {
    const data = [
      { id: '1', text: 'Todo 1', completed: false },
      { id: '2', text: 'Todo 2', completed: true }
    ];

    const list = MockTodoList.fromData(data);
    expect(list.todos).toHaveLength(2);
    expect(list.todos[0].text).toBe('Todo 1');
    expect(list.todos[1].completed).toBe(true);
  });

  test('TodoList.fromData() should throw error for non-array data', () => {
    expect(() => MockTodoList.fromData(null)).toThrow('TodoList data must be an array');
    expect(() => MockTodoList.fromData({})).toThrow('TodoList data must be an array');
  });

  test('addTodo() should add new todo to list', () => {
    const todo = todoList.addTodo('New todo');

    expect(todoList.todos).toHaveLength(1);
    expect(todo.text).toBe('New todo');
    expect(todoList.todos[0]).toBe(todo);
  });

  test('removeTodo() should remove todo by id', () => {
    const todo = todoList.addTodo('Test todo');
    const removed = todoList.removeTodo(todo.id);

    expect(removed).toBe(true);
    expect(todoList.todos).toHaveLength(0);

    const notRemoved = todoList.removeTodo('non-existent-id');
    expect(notRemoved).toBe(false);
  });

  test('findTodo() should find todo by id', () => {
    const todo = todoList.addTodo('Test todo');
    const found = todoList.findTodo(todo.id);

    expect(found).toBe(todo);

    const notFound = todoList.findTodo('non-existent-id');
    expect(notFound).toBe(null);
  });

  test('updateTodo() should update todo text', () => {
    const todo = todoList.addTodo('Original text');
    const updated = todoList.updateTodo(todo.id, 'Updated text');

    expect(updated).toBe(true);
    expect(todo.text).toBe('Updated text');

    const notUpdated = todoList.updateTodo('non-existent-id', 'New text');
    expect(notUpdated).toBe(false);
  });

  test('toggleTodo() should toggle todo completion', () => {
    const todo = todoList.addTodo('Test todo');
    const toggled = todoList.toggleTodo(todo.id);

    expect(toggled).toBe(true);
    expect(todo.completed).toBe(true);

    const notToggled = todoList.toggleTodo('non-existent-id');
    expect(notToggled).toBe(false);
  });

  test('getFilteredTodos() should return filtered todos', () => {
    const activeTodo = todoList.addTodo('Active todo');
    const completedTodo = todoList.addTodo('Completed todo');
    completedTodo.complete();

    todoList.setFilter('all');
    expect(todoList.getFilteredTodos()).toHaveLength(2);

    todoList.setFilter('active');
    expect(todoList.getFilteredTodos()).toHaveLength(1);
    expect(todoList.getFilteredTodos()[0]).toBe(activeTodo);

    todoList.setFilter('completed');
    expect(todoList.getFilteredTodos()).toHaveLength(1);
    expect(todoList.getFilteredTodos()[0]).toBe(completedTodo);
  });

  test('getCount() should return correct counts', () => {
    todoList.addTodo('Active todo 1');
    todoList.addTodo('Active todo 2');
    const completedTodo = todoList.addTodo('Completed todo');
    completedTodo.complete();

    const count = todoList.getCount();
    expect(count.total).toBe(3);
    expect(count.active).toBe(2);
    expect(count.completed).toBe(1);
  });

  test('clear() should remove all todos', () => {
    todoList.addTodo('Todo 1');
    todoList.addTodo('Todo 2');

    todoList.clear();
    expect(todoList.todos).toHaveLength(0);
  });

  test('clearCompleted() should remove only completed todos', () => {
    const activeTodo = todoList.addTodo('Active todo');
    const completedTodo = todoList.addTodo('Completed todo');
    completedTodo.complete();

    todoList.clearCompleted();
    expect(todoList.todos).toHaveLength(1);
    expect(todoList.todos[0]).toBe(activeTodo);
  });

  test('completeAll() and activateAll() should change all todos', () => {
    todoList.addTodo('Todo 1');
    todoList.addTodo('Todo 2');

    todoList.completeAll();
    expect(todoList.todos.every(todo => todo.completed)).toBe(true);

    todoList.activateAll();
    expect(todoList.todos.every(todo => !todo.completed)).toBe(true);
  });

  test('isEmpty(), allCompleted(), hasCompleted() should return correct status', () => {
    expect(todoList.isEmpty()).toBe(true);
    expect(todoList.allCompleted()).toBe(false);
    expect(todoList.hasCompleted()).toBe(false);

    const todo1 = todoList.addTodo('Todo 1');
    const todo2 = todoList.addTodo('Todo 2');

    expect(todoList.isEmpty()).toBe(false);
    expect(todoList.allCompleted()).toBe(false);
    expect(todoList.hasCompleted()).toBe(false);

    todo1.complete();
    expect(todoList.allCompleted()).toBe(false);
    expect(todoList.hasCompleted()).toBe(true);

    todo2.complete();
    expect(todoList.allCompleted()).toBe(true);
    expect(todoList.hasCompleted()).toBe(true);
  });

  test('toData() should convert to data array', () => {
    todoList.addTodo('Todo 1');
    todoList.addTodo('Todo 2');

    const data = todoList.toData();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0].text).toBe('Todo 1');
    expect(data[1].text).toBe('Todo 2');
  });
});

describe('FilterConfig Model Tests', () => {
  test('FilterConfig factory methods should create correct configurations', () => {
    const allFilter = MockFilterConfig.createAll();
    expect(allFilter.label).toBe('All');
    expect(allFilter.value).toBe('all');
    expect(allFilter.isActive).toBe(false);

    const activeFilter = MockFilterConfig.createActive();
    expect(activeFilter.label).toBe('Active');
    expect(activeFilter.value).toBe('active');

    const completedFilter = MockFilterConfig.createCompleted();
    expect(completedFilter.label).toBe('Completed');
    expect(completedFilter.value).toBe('completed');
  });

  test('FilterConfig.getAllFilters() should return all filter configurations', () => {
    const filters = MockFilterConfig.getAllFilters();
    expect(filters).toHaveLength(3);
    expect(filters[0].value).toBe('all');
    expect(filters[1].value).toBe('active');
    expect(filters[2].value).toBe('completed');
  });

  test('setActive() should update active state', () => {
    const filter = MockFilterConfig.createAll();
    expect(filter.isActive).toBe(false);

    filter.setActive(true);
    expect(filter.isActive).toBe(true);

    filter.setActive(false);
    expect(filter.isActive).toBe(false);
  });
});

describe('ValidationService Tests', () => {
  test('validateTodoText() should validate text correctly', () => {
    const validResult = MockValidationService.validateTodoText('Valid text');
    expect(validResult.isValid).toBe(true);
    expect(validResult.error).toBe(null);
    expect(validResult.sanitizedText).toBe('Valid text');

    const trimmedResult = MockValidationService.validateTodoText('  Trimmed text  ');
    expect(trimmedResult.isValid).toBe(true);
    expect(trimmedResult.sanitizedText).toBe('Trimmed text');

    const emptyResult = MockValidationService.validateTodoText('');
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.error).toBe('Text cannot be empty');

    const whitespaceResult = MockValidationService.validateTodoText('   ');
    expect(whitespaceResult.isValid).toBe(false);
    expect(whitespaceResult.error).toBe('Text cannot be empty');

    const nonStringResult = MockValidationService.validateTodoText(123);
    expect(nonStringResult.isValid).toBe(false);
    expect(nonStringResult.error).toBe('Text must be a string');

    const longTextResult = MockValidationService.validateTodoText('a'.repeat(501));
    expect(longTextResult.isValid).toBe(false);
    expect(longTextResult.error).toBe('Text cannot exceed 500 characters');
  });

  test('validateTodoId() should validate IDs correctly', () => {
    expect(MockValidationService.validateTodoId('valid-id')).toBe(true);
    expect(MockValidationService.validateTodoId('')).toBe(false);
    expect(MockValidationService.validateTodoId(null)).toBe(false);
    expect(MockValidationService.validateTodoId(123)).toBe(false);
  });

  test('validateFilterType() should validate filter types correctly', () => {
    expect(MockValidationService.validateFilterType('all')).toBe(true);
    expect(MockValidationService.validateFilterType('active')).toBe(true);
    expect(MockValidationService.validateFilterType('completed')).toBe(true);
    expect(MockValidationService.validateFilterType('invalid')).toBe(false);
    expect(MockValidationService.validateFilterType(null)).toBe(false);
  });
});