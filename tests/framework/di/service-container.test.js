/**
 * Tests for ServiceContainer
 */

import ServiceContainer from '../../../src/framework/di/service-container.js';

describe('ServiceContainer', () => {
    let container;

    beforeEach(() => {
        container = new ServiceContainer();
    });

    describe('Service Registration', () => {
        test('should register a service with constructor', () => {
            class TestService {
                constructor() {
                    this.name = 'test';
                }
            }

            container.register('testService', TestService);
            expect(container.has('testService')).toBe(true);
        });

        test('should register a service with factory function', () => {
            const factory = () => ({ name: 'factory' });

            container.register('factoryService', factory, { factory: true });
            expect(container.has('factoryService')).toBe(true);
        });

        test('should register singleton service', () => {
            class TestService {
                constructor() {
                    this.id = Math.random();
                }
            }

            container.registerSingleton('singleton', TestService);

            const instance1 = container.resolve('singleton');
            const instance2 = container.resolve('singleton');

            expect(instance1).toBe(instance2);
            expect(instance1.id).toBe(instance2.id);
        });

        test('should register factory service', () => {
            const factory = () => ({ id: Math.random() });

            container.registerFactory('factory', factory);

            const instance1 = container.resolve('factory');
            const instance2 = container.resolve('factory');

            expect(instance1).not.toBe(instance2);
            expect(instance1.id).not.toBe(instance2.id);
        });

        test('should register instance directly', () => {
            const instance = { name: 'direct' };

            container.registerInstance('direct', instance);

            const resolved = container.resolve('direct');
            expect(resolved).toBe(instance);
        });

        test('should throw error for invalid service name', () => {
            expect(() => {
                container.register('', () => {});
            }).toThrow('Service name must be a non-empty string');

            expect(() => {
                container.register(null, () => {});
            }).toThrow('Service name must be a non-empty string');
        });

        test('should throw error for invalid service definition', () => {
            expect(() => {
                container.register('test', null);
            }).toThrow('Service definition must be a function or object');

            expect(() => {
                container.register('test', 'invalid');
            }).toThrow('Service definition must be a function or object');
        });

        test('should throw error for invalid lifecycle', () => {
            expect(() => {
                container.register('test', () => {}, { lifecycle: 'invalid' });
            }).toThrow('Lifecycle must be either "singleton" or "factory"');
        });

        test('should throw error for invalid dependencies', () => {
            expect(() => {
                container.register('test', () => {}, { dependencies: 'invalid' });
            }).toThrow('Dependencies must be an array');
        });
    });

    describe('Service Resolution', () => {
        test('should resolve service without dependencies', () => {
            class TestService {
                constructor() {
                    this.name = 'test';
                }
            }

            container.register('test', TestService);
            const instance = container.resolve('test');

            expect(instance).toBeInstanceOf(TestService);
            expect(instance.name).toBe('test');
        });

        test('should resolve service with dependencies', () => {
            class DatabaseService {
                constructor() {
                    this.connected = true;
                }
            }

            class UserService {
                constructor(database) {
                    this.database = database;
                }
            }

            container.register('database', DatabaseService);
            container.register('userService', UserService, { dependencies: ['database'] });

            const userService = container.resolve('userService');

            expect(userService).toBeInstanceOf(UserService);
            expect(userService.database).toBeInstanceOf(DatabaseService);
            expect(userService.database.connected).toBe(true);
        });

        test('should resolve nested dependencies', () => {
            class ConfigService {
                constructor() {
                    this.config = { db: 'localhost' };
                }
            }

            class DatabaseService {
                constructor(config) {
                    this.config = config;
                }
            }

            class UserService {
                constructor(database) {
                    this.database = database;
                }
            }

            container.register('config', ConfigService);
            container.register('database', DatabaseService, { dependencies: ['config'] });
            container.register('userService', UserService, { dependencies: ['database'] });

            const userService = container.resolve('userService');

            expect(userService.database.config.config.db).toBe('localhost');
        });

        test('should throw error for unregistered service', () => {
            expect(() => {
                container.resolve('nonexistent');
            }).toThrow("Service 'nonexistent' is not registered");
        });

        test('should throw error for invalid service name in resolve', () => {
            expect(() => {
                container.resolve('');
            }).toThrow('Service name must be a non-empty string');
        });
    });

    describe('Circular Dependency Detection', () => {
        test('should detect direct circular dependency', () => {
            class ServiceA {
                constructor(serviceB) {
                    this.serviceB = serviceB;
                }
            }

            class ServiceB {
                constructor(serviceA) {
                    this.serviceA = serviceA;
                }
            }

            container.register('serviceA', ServiceA, { dependencies: ['serviceB'] });
            container.register('serviceB', ServiceB, { dependencies: ['serviceA'] });

            expect(() => {
                container.resolve('serviceA');
            }).toThrow(/Circular dependency detected/);
        });

        test('should detect indirect circular dependency', () => {
            class ServiceA {
                constructor(serviceB) {
                    this.serviceB = serviceB;
                }
            }

            class ServiceB {
                constructor(serviceC) {
                    this.serviceC = serviceC;
                }
            }

            class ServiceC {
                constructor(serviceA) {
                    this.serviceA = serviceA;
                }
            }

            container.register('serviceA', ServiceA, { dependencies: ['serviceB'] });
            container.register('serviceB', ServiceB, { dependencies: ['serviceC'] });
            container.register('serviceC', ServiceC, { dependencies: ['serviceA'] });

            expect(() => {
                container.resolve('serviceA');
            }).toThrow(/Circular dependency detected/);
        });

        test('should allow self-referencing after resolution', () => {
            class ServiceA {
                constructor() {
                    this.name = 'A';
                }

                setReference(ref) {
                    this.reference = ref;
                }
            }

            container.registerSingleton('serviceA', ServiceA);

            const instance1 = container.resolve('serviceA');
            const instance2 = container.resolve('serviceA');

            instance1.setReference(instance2);

            expect(instance1).toBe(instance2);
            expect(instance1.reference).toBe(instance1);
        });
    });

    describe('Service Validation', () => {
        test('should validate services without errors', () => {
            class ServiceA {}
            class ServiceB {
                constructor(serviceA) {
                    this.serviceA = serviceA;
                }
            }

            container.register('serviceA', ServiceA);
            container.register('serviceB', ServiceB, { dependencies: ['serviceA'] });

            const errors = container.validateServices();
            expect(errors).toHaveLength(0);
        });

        test('should detect missing dependency in validation', () => {
            class ServiceB {
                constructor(serviceA) {
                    this.serviceA = serviceA;
                }
            }

            container.register('serviceB', ServiceB, { dependencies: ['serviceA'] });

            const errors = container.validateServices();
            expect(errors).toContain("Service 'serviceA' is referenced but not registered");
        });

        test('should detect circular dependency in validation', () => {
            class ServiceA {
                constructor(serviceB) {
                    this.serviceB = serviceB;
                }
            }

            class ServiceB {
                constructor(serviceA) {
                    this.serviceA = serviceA;
                }
            }

            container.register('serviceA', ServiceA, { dependencies: ['serviceB'] });
            container.register('serviceB', ServiceB, { dependencies: ['serviceA'] });

            const errors = container.validateServices();
            expect(errors.some(error => error.includes('Circular dependency'))).toBe(true);
        });
    });

    describe('Container Management', () => {
        test('should get service names', () => {
            container.register('service1', () => {});
            container.register('service2', () => {});

            const names = container.getServiceNames();
            expect(names).toContain('service1');
            expect(names).toContain('service2');
            expect(names).toHaveLength(2);
        });

        test('should get service configuration', () => {
            class TestService {}
            container.register('test', TestService, { dependencies: ['dep1'] });

            const config = container.getServiceConfig('test');
            expect(config.name).toBe('test');
            expect(config.lifecycle).toBe('singleton');
            expect(config.dependencies).toEqual(['dep1']);
            expect(config.resolved).toBe(false);
        });

        test('should clear all services', () => {
            container.register('service1', () => {});
            container.register('service2', () => {});

            expect(container.getServiceNames()).toHaveLength(2);

            container.clear();

            expect(container.getServiceNames()).toHaveLength(0);
        });

        test('should remove specific service', () => {
            container.register('service1', () => {});
            container.register('service2', () => {});

            expect(container.has('service1')).toBe(true);
            expect(container.has('service2')).toBe(true);

            container.remove('service1');

            expect(container.has('service1')).toBe(false);
            expect(container.has('service2')).toBe(true);
        });
    });
});