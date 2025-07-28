/**
 * TodoLang Dependency Injection Example
 *
 * This example demonstrates the complete DI system with realistic services
 * that would be used in the TodoApp.
 */

import { ServiceRegistry } from '../src/framework/di/index.js';

console.log('🚀 TodoLang Dependency Injection Example\n');

// Create a new service registry
const registry = new ServiceRegistry();

// Define application services
class ConfigService {
    constructor() {
        this.config = {
            storageKey: 'todos',
            maxTodos: 1000,
            autoSave: true,
            theme: 'light'
        };
        console.log('📋 ConfigService initialized');
    }

    get(key) {
        return this.config[key];
    }

    set(key, value) {
        this.config[key] = value;
    }
}

class LoggerService {
    constructor() {
        this.logs = [];
        console.log('📝 LoggerService initialized');
    }

    log(message, level = 'info') {
        const entry = {
            message,
            level,
            timestamp: new Date().toISOString()
        };
        this.logs.push(entry);
        console.log(`[${level.toUpperCase()}] ${message}`);
    }

    error(message) {
        this.log(message, 'error');
    }

    warn(message) {
        this.log(message, 'warn');
    }

    getLogs() {
        return [...this.logs];
    }
}

class StorageService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.storage = new Map();
        this.logger.log('💾 StorageService initialized with config');
    }

    save(key, data) {
        try {
            this.storage.set(key, JSON.stringify(data));
            this.logger.log(`Data saved to ${key}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to save data: ${error.message}`);
            return false;
        }
    }

    load(key) {
        try {
            const data = this.storage.get(key);
            if (data) {
                this.logger.log(`Data loaded from ${key}`);
                return JSON.parse(data);
            }
            return null;
        } catch (error) {
            this.logger.error(`Failed to load data: ${error.message}`);
            return null;
        }
    }

    clear(key) {
        this.storage.delete(key);
        this.logger.log(`Data cleared from ${key}`);
    }
}

class ValidationService {
    constructor(logger) {
        this.logger = logger;
        this.logger.log('✅ ValidationService initialized');
    }

    validateTodo(text) {
        if (!text || typeof text !== 'string') {
            this.logger.warn('Todo validation failed: invalid text type');
            return { valid: false, error: 'Text must be a string' };
        }

        if (text.trim().length === 0) {
            this.logger.warn('Todo validation failxt');
            return { valid: false, error: 'Text cannot be empty' };
        }

        if (text.length > 500) {
            this.logger.warn('Todo validation failed: text too long');
            return { valid: false, error: 'Text cannot exceed 500 characters' };
        }

        return { valid: true };
    }
}

class TodoService {
    constructor(storage, validation, logger, config) {
        this.storage = storage;
        this.validation = validation;
        this.logger = logger;
        this.config = config;
        this.todos = this.loadTodos();
        this.logger.log('📝 TodoService initialized');
    }

    loadTodos() {
        const storageKey = this.config.get('storageKey');
        const todos = this.storage.load(storageKey) || [];
        this.logger.log(`Loaded ${todos.length} todos from storage`);
        return todos;
    }

    addTodo(text) {
        const validation = this.validation.validateTodo(text);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const maxTodos = this.config.get('maxTodos');
        if (this.todos.length >= maxTodos) {
            throw new Error(`Cannot exceed ${maxTodos} todos`);
        }

        const todo = {
            id: Date.now().toString(),
            text: text.trim(),
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.todos.push(todo);
        this.saveTodos();
        this.logger.log(`Added todo: "${text}"`);
        return todo;
    }

    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) {
            throw new Error(`Todo with id ${id} not found`);
        }

        todo.completed = !todo.completed;
        todo.updatedAt = new Date().toISOString();
        this.saveTodos();
        this.logger.log(`Toggled todo ${id}: ${todo.completed ? 'completed' : 'active'}`);
        return todo;
    }

    deleteTodo(id) {
        const index = this.todos.findIndex(t => t.id === id);
        if (index === -1) {
            throw new Error(`Todo with id ${id} not found`);
        }

        const todo = this.todos.splice(index, 1)[0];
        this.saveTodos();
        this.logger.log(`Deleted todo: "${todo.text}"`);
        return todo;
    }

    getTodos() {
        return [...this.todos];
    }

    getActiveTodos() {
        return this.todos.filter(todo => !todo.completed);
    }

    getCompletedTodos() {
        return this.todos.filter(todo => todo.completed);
    }

    saveTodos() {
        if (this.config.get('autoSave')) {
            const storageKey = this.config.get('storageKey');
            this.storage.save(storageKey, this.todos);
        }
    }
}

// Factory service example
const createRequestHandler = (logger) => {
    return {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        logger,

        handle(request) {
            this.logger.log(`Handling request ${this.id}: ${request}`);
            return { id: this.id, result: 'processed', request };
        }
    };
};

// Register all services
console.log('🔧 Registering services...');

registry.singleton('config', ConfigService);
registry.singleton('logger', LoggerService);
registry.singleton('storage', StorageService, ['config', 'logger']);
registry.singleton('validation', ValidationService, ['logger']);
registry.singleton('todoService', TodoService, ['storage', 'validation', 'logger', 'config']);
registry.factory('requestHandler', createRequestHandler, ['logger']);

// Validate the service configuration
console.log('\n🔍 Validating service configuration...');
const errors = registry.validate();
if (errors.length > 0) {
    console.log('❌ Validation errors found:');
    errors.forEach(error => console.log(`  - ${error}`));
} else {
    console.log('✅ All services validated successfully');
}

// Demonstrate the complete system
console.log('\n🎯 Demonstrating TodoApp workflow...');

try {
    // Get the main service
    const todoService = registry.get('todoService');
    const logger = registry.get('logger');

    console.log('\n📝 Adding todos...');
    const todo1 = todoService.addTodo('Learn TodoLang');
    const todo2 = todoService.addTodo('Build DI container');
    const todo3 = todoService.addTodo('Create awesome apps');

    console.log('\n📊 Current state:');
    console.log(`Total todos: ${todoService.getTodos().length}`);
    console.log(`Active todos: ${todoService.getActiveTodos().length}`);
    console.log(`Completed todos: ${todoService.getCompletedTodos().length}`);

    console.log('\n✅ Completing a todo...');
    todoService.toggleTodo(todo1.id);

    console.log('\n📊 Updated state:');
    console.log(`Total todos: ${todoService.getTodos().length}`);
    console.log(`Active todos: ${todoService.getActiveTodos().length}`);
    console.log(`Completed todos: ${todoService.getCompletedTodos().length}`);

    console.log('\n🗑️ Deleting a todo...');
    todoService.deleteTodo(todo2.id);

    console.log('\n📊 Final state:');
    console.log(`Total todos: ${todoService.getTodos().length}`);
    console.log(`Active todos: ${todoService.getActiveTodos().length}`);
    console.log(`Completed todos: ${todoService.getCompletedTodos().length}`);

    // Demonstrate factory services
    console.log('\n🏭 Testing factory services...');
    const handler1 = registry.get('requestHandler');
    const handler2 = registry.get('requestHandler');

    console.log(`Handler 1 ID: ${handler1.id}`);
    console.log(`Handler 2 ID: ${handler2.id}`);
    console.log(`Different instances: ${handler1.id !== handler2.id}`);

    handler1.handle('GET /todos');
    handler2.handle('POST /todos');

    // Show logs
    console.log('\n📋 Application logs:');
    const logs = logger.getLogs();
    logs.slice(-5).forEach(log => {
        console.log(`  ${log.timestamp} [${log.level}] ${log.message}`);
    });

    console.log('\n🎉 TodoApp DI system demonstration completed successfully!');

} catch (error) {
    console.error('❌ Error during demonstration:', error.message);
}

// Demonstrate error handling
console.log('\n🚨 Testing error handling...');

try {
    const todoService = registry.get('todoService');
    todoService.addTodo(''); // Should fail validation
} catch (error) {
    console.log(`✅ Validation error caught: ${error.message}`);
}

try {
    const todoService = registry.get('todoService');
    todoService.toggleTodo('nonexistent'); // Should fail
} catch (error) {
    console.log(`✅ Not found error caught: ${error.message}`);
}

console.log('\n✨ All demonstrations completed!');