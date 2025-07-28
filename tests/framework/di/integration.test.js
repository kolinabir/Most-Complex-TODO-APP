/**
 * Integration tests for Dependency Injection system
 */

import { ServiceRegistry } from '../../../src/framework/di/index.js';

describe('DI Integration Tests', () => {
    let registry;

    beforeEach(() => {
        registry = new ServiceRegistry();
    });

    describe('TodoApp Service Integration', () => {
        // Mock services that would be used in the TodoApp
        class ConfigService {
            constructor() {
                this.config = {
                    storageKey: 'todos',
                    maxTodos: 1000,
                    autoSave: true
                };
            }

            get(key) {
                return this.config[key];
            }
        }

        class LoggerService {
            constructor() {
                this.logs = [];
            }

            log(message) {
                this.logs.push({ message, timestamp: Date.now() });
                console.log(`[LOG] ${message}`);
            }

            error(message) {
                this.logs.push({ message, timestamp: Date.now(), level: 'error' });
                console.error(`[ERROR] ${message}`);
            }
        }

        class StorageService {
            constructor(config, logger) {
                this.config = config;
                this.logger = logger;
                this.storage = new Map();
            }

            save(key, data) {
                try {
                    this.storage.set(key, JSON.stringify(data));
                    this.logger.log(`Saved data to ${key}`);
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
                        this.logger.log(`Loaded data from ${key}`);
                        return JSON.parse(data);
                    }
                    return null;
                } catch (error) {
                    this.logger.error(`Failed to load data: ${error.message}`);
                    return null;
                }
            }
        }

        class TodoService {
            constructor(storage, logger) {
                this.storage = storage;
                this.logger = logger;
                this.todos = this.loadTodos();
            }

            loadTodos() {
                const todos = this.storage.load('todos') || [];
                this.logger.log(`Loaded ${todos.length} todos`);
                return todos;
            }

            addTodo(text) {
                const todo = {
                    id: Date.now().toString(),
                    text,
                    completed: false,
                    createdAt: new Date()
                };

                this.todos.push(todo);
                this.saveTodos();
                this.logger.log(`Added todo: ${text}`);
                return todo;
            }

            toggleTodo(id) {
                const todo = this.todos.find(t => t.id === id);
                if (todo) {
                    todo.completed = !todo.completed;
                    this.saveTodos();
                    this.logger.log(`Toggled todo: ${id}`);
                    return todo;
                }
                return null;
            }

            deleteTodo(id) {
                const index = this.todos.findIndex(t => t.id === id);
                if (index !== -1) {
                    const todo = this.todos.splice(index, 1)[0];
                    this.saveTodos();
                    this.logger.log(`Deleted todo: ${id}`);
                    return todo;
                }
                return null;
            }

            getTodos() {
                return [...this.todos];
            }

            saveTodos() {
                this.storage.save('todos', this.todos);
            }
        }

        class TodoAppService {
            constructor(todoService, logger) {
                this.todoService = todoService;
                this.logger = logger;
                this.logger.log('TodoApp initialized');
            }

            createTodo(text) {
                if (!text || text.trim().length === 0) {
                    this.logger.error('Cannot create todo with empty text');
                    throw new Error('Todo text cannot be empty');
                }

                return this.todoService.addTodo(text.trim());
            }

            getAllTodos() {
                return this.todoService.getTodos();
            }

            getActiveTodos() {
                return this.todoService.getTodos().filter(todo => !todo.completed);
            }

            getCompletedTodos() {
                return this.todoService.getTodos().filter(todo => todo.completed);
            }

            toggleTodo(id) {
                return this.todoService.toggleTodo(id);
            }

            deleteTodo(id) {
                return this.todoService.deleteTodo(id);
            }
        }

        test('should wire up complete TodoApp service hierarchy', () => {
            // Register services with dependencies
            registry.singleton('config', ConfigService);
            registry.singleton('logger', LoggerService);
            registry.singleton('storage', StorageService, ['config', 'logger']);
            registry.singleton('todoService', TodoService, ['storage', 'logger']);
            registry.singleton('todoApp', TodoAppService, ['todoService', 'logger']);

            // Validate the service configuration
            const errors = registry.validate();
            expect(errors).toHaveLength(0);

            // Resolve the main application service
            const todoApp = registry.get('todoApp');

            expect(todoApp).toBeInstanceOf(TodoAppService);
            expect(todoApp.todoService).toBeInstanceOf(TodoService);
            expect(todoApp.todoService.storage).toBeInstanceOf(StorageService);
            expect(todoApp.todoService.storage.config).toBeInstanceOf(ConfigService);
        });

        test('should demonstrate complete todo workflow', () => {
            // Register services
            registry.singleton('config', ConfigService);
            registry.singleton('logger', LoggerService);
            registry.singleton('storage', StorageService, ['config', 'logger']);
            registry.singleton('todoService', TodoService, ['storage', 'logger']);
            registry.singleton('todoApp', TodoAppService, ['todoService', 'logger']);

            const todoApp = registry.get('todoApp');
            const logger = registry.get('logger');

            // Test complete workflow
            expect(todoApp.getAllTodos()).toHaveLength(0);

            // Add todos
            const todo1 = todoApp.createTodo('Learn TodoLang');
            const todo2 = todoApp.createTodo('Build DI container');

            expect(todoApp.getAllTodos()).toHaveLength(2);
            expect(todoApp.getActiveTodos()).toHaveLength(2);
            expect(todoApp.getCompletedTodos()).toHaveLength(0);

            // Complete a todo
            todoApp.toggleTodo(todo1.id);

            expect(todoApp.getActiveTodos()).toHaveLength(1);
            expect(todoApp.getCompletedTodos()).toHaveLength(1);

            // Delete a todo
            todoApp.deleteTodo(todo2.id);

            expect(todoApp.getAllTodos()).toHaveLength(1);

            // Verify logging occurred
            expect(logger.logs.length).toBeGreaterThan(0);
            expect(logger.logs.some(log => log.message.includes('TodoApp initialized'))).toBe(true);
        });

        test('should handle service errors gracefully', () => {
            registry.singleton('config', ConfigService);
            registry.singleton('logger', LoggerService);
            registry.singleton('storage', StorageService, ['config', 'logger']);
            registry.singleton('todoService', TodoService, ['storage', 'logger']);
            registry.singleton('todoApp', TodoAppService, ['todoService', 'logger']);

            const todoApp = registry.get('todoApp');

            // Test error handling
            expect(() => {
                todoApp.createTodo('');
            }).toThrow('Todo text cannot be empty');

            expect(() => {
                todoApp.createTodo('   ');
            }).toThrow('Todo text cannot be empty');
        });

        test('should maintain singleton behavior across resolutions', () => {
            registry.singleton('config', ConfigService);
            registry.singleton('logger', LoggerService);
            registry.singleton('storage', StorageService, ['config', 'logger']);
            registry.singleton('todoService', TodoService, ['storage', 'logger']);

            const todoService1 = registry.get('todoService');
            const todoService2 = registry.get('todoService');
            const storage1 = registry.get('storage');
            const storage2 = registry.get('storage');

            // Should be the same instances
            expect(todoService1).toBe(todoService2);
            expect(storage1).toBe(storage2);

            // Should share the same storage instance
            expect(todoService1.storage).toBe(storage1);
            expect(todoService2.storage).toBe(storage2);
        });
    });

    describe('Factory Services', () => {
        test('should create new instances with factory services', () => {
            class RequestService {
                constructor(logger) {
                    this.logger = logger;
                    this.id = Math.random();
                    this.timestamp = Date.now();
                }

                log(message) {
                    this.logger.log(`[Request ${this.id}] ${message}`);
                }
            }

            class LoggerService {
                constructor() {
                    this.logs = [];
                }

                log(message) {
                    this.logs.push(message);
                }
            }

            registry.singleton('logger', LoggerService);
            registry.factory('request', RequestService, ['logger']);

            const request1 = registry.get('request');
            const request2 = registry.get('request');
            const logger = registry.get('logger');

            // Should be different instances
            expect(request1).not.toBe(request2);
            expect(request1.id).not.toBe(request2.id);

            // But should share the same logger
            expect(request1.logger).toBe(logger);
            expect(request2.logger).toBe(logger);
        });
    });

    describe('Complex Dependency Graphs', () => {
        test('should handle deep dependency chains', () => {
            class Level1Service {
                constructor() {
                    this.level = 1;
                }
            }

            class Level2Service {
                constructor(level1) {
                    this.level = 2;
                    this.level1 = level1;
                }
            }

            class Level3Service {
                constructor(level2) {
                    this.level = 3;
                    this.level2 = level2;
                }
            }

            class Level4Service {
                constructor(level3) {
                    this.level = 4;
                    this.level3 = level3;
                }
            }

            registry.singleton('level1', Level1Service);
            registry.singleton('level2', Level2Service, ['level1']);
            registry.singleton('level3', Level3Service, ['level2']);
            registry.singleton('level4', Level4Service, ['level3']);

            const level4 = registry.get('level4');

            expect(level4.level).toBe(4);
            expect(level4.level3.level).toBe(3);
            expect(level4.level3.level2.level).toBe(2);
            expect(level4.level3.level2.level1.level).toBe(1);
        });

        test('should handle multiple dependencies', () => {
            class DatabaseService {
                constructor() {
                    this.connected = true;
                }
            }

            class CacheService {
                constructor() {
                    this.cache = new Map();
                }
            }

            class LoggerService {
                constructor() {
                    this.logs = [];
                }
            }

            class UserService {
                constructor(database, cache, logger) {
                    this.database = database;
                    this.cache = cache;
                    this.logger = logger;
                }

                getUser(id) {
                    this.logger.logs.push(`Getting user ${id}`);

                    if (this.cache.cache.has(id)) {
                        return this.cache.cache.get(id);
                    }

                    // Simulate database lookup
                    const user = { id, name: `User ${id}` };
                    this.cache.cache.set(id, user);
                    return user;
                }
            }

            registry.singleton('database', DatabaseService);
            registry.singleton('cache', CacheService);
            registry.singleton('logger', LoggerService);
            registry.singleton('userService', UserService, ['database', 'cache', 'logger']);

            const userService = registry.get('userService');
            const user = userService.getUser(1);

            expect(user.id).toBe(1);
            expect(user.name).toBe('User 1');
            expect(userService.logger.logs).toContain('Getting user 1');
        });
    });
});